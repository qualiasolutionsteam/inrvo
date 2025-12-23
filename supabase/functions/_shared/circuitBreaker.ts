/**
 * Circuit Breaker Pattern for External API Calls
 * Prevents cascading failures by temporarily blocking requests to failing services
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests are immediately rejected
 * - HALF_OPEN: Testing if service has recovered
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms before attempting recovery (moving to HALF_OPEN) */
  resetTimeoutMs: number;
  /** Number of successful requests in HALF_OPEN before closing circuit */
  successThreshold: number;
  /** Service name for logging */
  serviceName: string;
}

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastStateChange: number;
}

// In-memory store for circuit states
const circuitStates = new Map<string, CircuitBreakerState>();

// Default configurations for known services
export const CIRCUIT_CONFIGS: Record<string, CircuitBreakerConfig> = {
  elevenlabs: {
    failureThreshold: 3,
    resetTimeoutMs: 30000, // 30 seconds
    successThreshold: 2,
    serviceName: 'ElevenLabs',
  },
  gemini: {
    failureThreshold: 3,
    resetTimeoutMs: 30000, // 30 seconds
    successThreshold: 2,
    serviceName: 'Gemini',
  },
};

function getOrCreateState(serviceKey: string): CircuitBreakerState {
  let state = circuitStates.get(serviceKey);
  if (!state) {
    state = {
      state: 'CLOSED',
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      lastStateChange: Date.now(),
    };
    circuitStates.set(serviceKey, state);
  }
  return state;
}

/**
 * Check if the circuit allows a request to pass through
 */
export function canRequest(serviceKey: string, config: CircuitBreakerConfig): boolean {
  const state = getOrCreateState(serviceKey);
  const now = Date.now();

  switch (state.state) {
    case 'CLOSED':
      return true;

    case 'OPEN':
      // Check if reset timeout has passed
      if (now - state.lastFailureTime >= config.resetTimeoutMs) {
        // Transition to HALF_OPEN
        state.state = 'HALF_OPEN';
        state.successes = 0;
        state.lastStateChange = now;
        console.log(`[CircuitBreaker] ${config.serviceName}: OPEN -> HALF_OPEN (testing recovery)`);
        return true;
      }
      return false;

    case 'HALF_OPEN':
      // Allow limited requests for testing
      return true;

    default:
      return true;
  }
}

/**
 * Record a successful request
 */
export function recordSuccess(serviceKey: string, config: CircuitBreakerConfig): void {
  const state = getOrCreateState(serviceKey);

  if (state.state === 'HALF_OPEN') {
    state.successes++;
    if (state.successes >= config.successThreshold) {
      // Service has recovered, close the circuit
      state.state = 'CLOSED';
      state.failures = 0;
      state.successes = 0;
      state.lastStateChange = Date.now();
      console.log(`[CircuitBreaker] ${config.serviceName}: HALF_OPEN -> CLOSED (recovered)`);
    }
  } else if (state.state === 'CLOSED') {
    // Reset failure count on success
    state.failures = 0;
  }
}

/**
 * Record a failed request
 */
export function recordFailure(serviceKey: string, config: CircuitBreakerConfig): void {
  const state = getOrCreateState(serviceKey);
  const now = Date.now();

  state.failures++;
  state.lastFailureTime = now;

  if (state.state === 'HALF_OPEN') {
    // Any failure in HALF_OPEN immediately opens the circuit
    state.state = 'OPEN';
    state.lastStateChange = now;
    console.log(`[CircuitBreaker] ${config.serviceName}: HALF_OPEN -> OPEN (failed during recovery)`);
  } else if (state.state === 'CLOSED' && state.failures >= config.failureThreshold) {
    // Too many failures, open the circuit
    state.state = 'OPEN';
    state.lastStateChange = now;
    console.log(`[CircuitBreaker] ${config.serviceName}: CLOSED -> OPEN (threshold reached: ${state.failures} failures)`);
  }
}

/**
 * Get current circuit state for monitoring
 */
export function getCircuitState(serviceKey: string): CircuitBreakerState {
  return getOrCreateState(serviceKey);
}

/**
 * Wrapper function to execute a request with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
  serviceKey: string,
  config: CircuitBreakerConfig,
  operation: () => Promise<T>
): Promise<T> {
  if (!canRequest(serviceKey, config)) {
    const state = getOrCreateState(serviceKey);
    const retryAfterMs = config.resetTimeoutMs - (Date.now() - state.lastFailureTime);
    throw new CircuitBreakerError(
      `${config.serviceName} service is temporarily unavailable. Please try again in ${Math.ceil(retryAfterMs / 1000)} seconds.`,
      serviceKey,
      retryAfterMs
    );
  }

  try {
    const result = await operation();
    recordSuccess(serviceKey, config);
    return result;
  } catch (error) {
    recordFailure(serviceKey, config);
    throw error;
  }
}

/**
 * Custom error class for circuit breaker rejections
 */
export class CircuitBreakerError extends Error {
  readonly serviceKey: string;
  readonly retryAfterMs: number;
  readonly isCircuitBreakerError = true;

  constructor(message: string, serviceKey: string, retryAfterMs: number) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.serviceKey = serviceKey;
    this.retryAfterMs = retryAfterMs;
  }
}
