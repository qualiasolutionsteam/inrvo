/**
 * Shared compression utilities for Edge Functions
 * Uses native CompressionStream API available in Deno
 */

/**
 * Compresses a string using gzip and returns base64-encoded result
 */
export async function compressToGzip(data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const inputBytes = encoder.encode(data);

  const compressionStream = new CompressionStream('gzip');
  const writer = compressionStream.writable.getWriter();
  const reader = compressionStream.readable.getReader();

  // Write data and close
  writer.write(inputBytes);
  writer.close();

  // Read compressed chunks
  const chunks: Uint8Array[] = [];
  let done = false;
  while (!done) {
    const result = await reader.read();
    if (result.value) {
      chunks.push(result.value);
    }
    done = result.done;
  }

  // Combine chunks into single Uint8Array
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const compressed = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    compressed.set(chunk, offset);
    offset += chunk.length;
  }

  return compressed;
}

/**
 * Creates a compressed JSON response with proper headers
 * Falls back to uncompressed if compression fails or data is too small
 *
 * @param data - Data to serialize to JSON
 * @param corsHeaders - CORS headers to include
 * @param options.status - HTTP status code (default: 200)
 * @param options.minSize - Minimum size to trigger compression (default: 1024)
 * @param options.skipCompression - Skip compression entirely (e.g., for already-compressed audio)
 */
export async function createCompressedResponse(
  data: unknown,
  corsHeaders: Record<string, string>,
  options: { status?: number; minSize?: number; skipCompression?: boolean } = {}
): Promise<Response> {
  const { status = 200, minSize = 1024, skipCompression = false } = options;
  const jsonString = JSON.stringify(data);

  // Skip compression if explicitly disabled (e.g., for already-compressed audio like MP3)
  // or for small payloads (overhead not worth it)
  if (skipCompression || jsonString.length < minSize) {
    return new Response(jsonString, {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    const compressed = await compressToGzip(jsonString);

    // Only use compression if it actually reduces size
    if (compressed.length < jsonString.length * 0.9) {
      return new Response(compressed as unknown as BodyInit, {
        status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Encoding': 'gzip',
          'Vary': 'Accept-Encoding',
        },
      });
    }
  } catch (error) {
    console.warn('Compression failed, falling back to uncompressed:', error);
  }

  // Fallback to uncompressed
  return new Response(jsonString, {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Shared CORS headers configuration
 * Uses environment variable for additional allowed origins
 */
const PRODUCTION_ORIGINS = [
  'https://www.inrvo.com',
  'https://inrvo.com',
  'https://inrvo.vercel.app',
];

// Development origins - only allowed when ALLOW_DEV_ORIGINS is set
const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
];

// Get allowed origins from environment or use defaults
const envOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',').map(o => o.trim()).filter(Boolean) || [];
const allowDevOrigins = Deno.env.get('ALLOW_DEV_ORIGINS') === 'true';

export const ALLOWED_ORIGINS = [
  ...PRODUCTION_ORIGINS,
  ...envOrigins,
  ...(allowDevOrigins ? DEV_ORIGINS : []),
];

// Project-specific patterns for Vercel preview deployments
// Only allow deployments that belong to this project (start with "inrvo")
const VERCEL_PREVIEW_PATTERNS = [
  // Preview deployments: inrvo-abc123-team.vercel.app
  /^https:\/\/inrvo-[a-z0-9]+-[a-z0-9]+\.vercel\.app$/,
  // Branch deployments: inrvo-git-branch-name-team.vercel.app
  /^https:\/\/inrvo-git-[a-z0-9-]+\.vercel\.app$/,
  // PR preview deployments
  /^https:\/\/inrvo-[a-z0-9-]+-qualiasolutions\.vercel\.app$/,
];

/**
 * Check if origin is allowed
 * More restrictive than wildcard patterns - only allows project-specific Vercel deployments
 */
function isOriginAllowed(origin: string): boolean {
  // Check exact matches first (production domains)
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  // Check project-specific Vercel preview patterns
  for (const pattern of VERCEL_PREVIEW_PATTERNS) {
    if (pattern.test(origin)) {
      return true;
    }
  }

  // Allow GitHub Codespaces only in development mode
  // (when ALLOW_DEV_ORIGINS is true)
  if (allowDevOrigins && origin.endsWith('.github.dev') && origin.startsWith('https://')) {
    return true;
  }

  return false;
}

export function getCorsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin && isOriginAllowed(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept-encoding, x-request-id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
