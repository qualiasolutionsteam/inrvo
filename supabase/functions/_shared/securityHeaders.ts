/**
 * Security Headers Module
 * Adds security headers to all Edge Function responses
 */

/**
 * Standard security headers for all Edge Function responses
 */
export const SECURITY_HEADERS: Record<string, string> = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Prevent clickjacking - deny framing entirely
  'X-Frame-Options': 'DENY',

  // Enable XSS filter in older browsers
  'X-XSS-Protection': '1; mode=block',

  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Prevent caching of sensitive API responses
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
  'Expires': '0',

  // Content Security Policy for API responses
  // This is restrictive since edge functions return JSON, not HTML
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",

  // Strict Transport Security (HSTS)
  // max-age=31536000 (1 year), includeSubDomains
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',

  // Permissions Policy - disable all features since this is an API
  'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
};

/**
 * Headers for audio/binary responses (less restrictive caching)
 */
export const AUDIO_RESPONSE_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Allow browser caching for audio (reduces re-fetching)
  'Cache-Control': 'private, max-age=3600',
};

/**
 * Add security headers to existing headers object
 * @param headers Existing headers
 * @param isAudioResponse Whether this is an audio/binary response
 * @returns Combined headers
 */
export function addSecurityHeaders(
  headers: Record<string, string>,
  isAudioResponse: boolean = false
): Record<string, string> {
  const securityHeaders = isAudioResponse ? AUDIO_RESPONSE_HEADERS : SECURITY_HEADERS;
  return { ...headers, ...securityHeaders };
}

/**
 * Create Headers object with security headers
 * @param headers Existing headers
 * @param isAudioResponse Whether this is an audio/binary response
 * @returns Headers object
 */
export function createSecureHeaders(
  headers: Record<string, string>,
  isAudioResponse: boolean = false
): Headers {
  const allHeaders = addSecurityHeaders(headers, isAudioResponse);
  return new Headers(allHeaders);
}

/**
 * Create a secure JSON response with all necessary headers
 */
export function createSecureJsonResponse(
  data: unknown,
  status: number = 200,
  additionalHeaders: Record<string, string> = {}
): Response {
  const headers = addSecurityHeaders({
    'Content-Type': 'application/json',
    ...additionalHeaders,
  });

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

/**
 * Create a secure error response
 */
export function createSecureErrorResponse(
  error: string,
  status: number = 500,
  requestId?: string,
  additionalData: Record<string, unknown> = {}
): Response {
  return createSecureJsonResponse(
    { error, requestId, ...additionalData },
    status
  );
}
