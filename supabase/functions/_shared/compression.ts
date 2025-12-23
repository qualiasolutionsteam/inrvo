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
 */
export async function createCompressedResponse(
  data: unknown,
  corsHeaders: Record<string, string>,
  options: { status?: number; minSize?: number } = {}
): Promise<Response> {
  const { status = 200, minSize = 1024 } = options;
  const jsonString = JSON.stringify(data);

  // Skip compression for small payloads (overhead not worth it)
  if (jsonString.length < minSize) {
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
      return new Response(compressed, {
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
 */
export const ALLOWED_ORIGINS = [
  'https://www.inrvo.com',
  'https://inrvo.com',
  'https://inrvo.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept-encoding',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
