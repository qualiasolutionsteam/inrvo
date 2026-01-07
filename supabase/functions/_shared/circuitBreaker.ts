/**
 * Simple Circuit Breaker for Edge Functions
 * Prevents cascading failures by temporarily blocking requests to failing services
 */

export interface CircuitConfig {
  failureThreshold: number;    // Number of failures before opening circuit
  resetTimeoutMs: number;      // Time before attempting to close circuit
  halfOpenRequests: number;    // Requests allowed in half-open state
}

export const CIRCUIT_CONFIGS: Record<string, CircuitConfig> = {
  openrouter: {
    failureThreshold: 5,
    resetTimeoutMs: 30000,     // 30 seconds
    halfOpenRequests: 2,
  },
  replicate: {
    failureThreshold: 3,
    resetTimeoutMs: 60000,     // 60 seconds
    halfOpenRequests: 1,
  },
  'fish-audio': {
    failureThreshold: 3,
    resetTimeoutMs: 45000,     // 45 seconds (faster recovery than Replicate)
    halfOpenRequests: 1,
  },
  elevenlabs: {
    failureThreshold: 3,
    resetTimeoutMs: 45000,     // 45 seconds
    halfOpenRequests: 1,
  },
};

export class CircuitBreakerError extends Error {
  retryAfterMs: number;

  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.retryAfterMs = retryAfterMs;
  }
}

// In-memory circuit state (resets on cold start - acceptable for Edge Functions)
interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  halfOpenAttempts: number;
}

const circuits = new Map<string, CircuitState>();

function getCircuit(name: string): CircuitState {
  if (!circuits.has(name)) {
    circuits.set(name, {
      failures: 0,
      lastFailure: 0,
      state: 'closed',
      halfOpenAttempts: 0,
    });
  }
  return circuits.get(name)!;
}

/**
 * Execute a function with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
  circuitName: string,
  config: CircuitConfig,
  fn: () => Promise<T>
): Promise<T> {
  const circuit = getCircuit(circuitName);
  const now = Date.now();

  // Check if circuit should transition from open to half-open
  if (circuit.state === 'open') {
    const timeSinceFailure = now - circuit.lastFailure;
    if (timeSinceFailure >= config.resetTimeoutMs) {
      circuit.state = 'half-open';
      circuit.halfOpenAttempts = 0;
    } else {
      const retryAfter = config.resetTimeoutMs - timeSinceFailure;
      throw new CircuitBreakerError(
        `Circuit breaker open for ${circuitName}. Service temporarily unavailable.`,
        retryAfter
      );
    }
  }

  // Check half-open request limit
  if (circuit.state === 'half-open' && circuit.halfOpenAttempts >= config.halfOpenRequests) {
    const retryAfter = config.resetTimeoutMs - (now - circuit.lastFailure);
    throw new CircuitBreakerError(
      `Circuit breaker half-open for ${circuitName}. Waiting for test requests to complete.`,
      Math.max(retryAfter, 1000)
    );
  }

  try {
    if (circuit.state === 'half-open') {
      circuit.halfOpenAttempts++;
    }

    const result = await fn();

    // Success - reset circuit
    circuit.failures = 0;
    circuit.state = 'closed';
    circuit.halfOpenAttempts = 0;

    return result;
  } catch (error) {
    circuit.failures++;
    circuit.lastFailure = now;

    // Check if we should open the circuit
    if (circuit.failures >= config.failureThreshold) {
      circuit.state = 'open';
      console.warn(`[CircuitBreaker] Circuit ${circuitName} opened after ${circuit.failures} failures`);
    }

    throw error;
  }
}
