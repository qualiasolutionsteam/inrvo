/**
 * Shared tracing and logging utilities for Edge Functions
 * Provides structured logging with request ID correlation
 */

export interface LogContext {
  requestId: string;
  userId?: string;
  operation?: string;
  [key: string]: unknown;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Create a structured log entry with request context
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context: LogContext,
  extra?: Record<string, unknown>
): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    requestId: context.requestId,
    userId: context.userId,
    operation: context.operation,
    ...extra,
  });
}

/**
 * Logger factory that creates a logger bound to a request context
 */
export function createLogger(context: LogContext) {
  return {
    debug: (message: string, extra?: Record<string, unknown>) => {
      console.log(createLogEntry('debug', message, context, extra));
    },
    info: (message: string, extra?: Record<string, unknown>) => {
      console.log(createLogEntry('info', message, context, extra));
    },
    warn: (message: string, extra?: Record<string, unknown>) => {
      console.warn(createLogEntry('warn', message, context, extra));
    },
    error: (message: string, error?: Error | unknown, extra?: Record<string, unknown>) => {
      console.error(createLogEntry('error', message, context, {
        ...extra,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : String(error),
      }));
    },
  };
}

/**
 * Extract request ID from headers, or generate a new one
 */
export function getRequestId(req: Request): string {
  const requestId = req.headers.get('x-request-id');
  if (requestId) return requestId;

  // Generate a new request ID if not provided
  const timestamp = Date.now();
  const randomPart = Math.random().toString(16).slice(2, 10);
  return `${timestamp}-${randomPart}`;
}

/**
 * Create response headers including request ID for correlation
 */
export function getTracingHeaders(requestId: string): Record<string, string> {
  return {
    'X-Request-ID': requestId,
  };
}
