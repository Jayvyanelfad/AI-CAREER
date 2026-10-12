// Narrow abuse control for the execution endpoint.
//
// Two independent guards:
//  1. A sliding-window rate limit per authenticated user.
//  2. A global concurrency cap so executions never pile up unbounded.

class ExecutionRateLimiter {
  constructor({ maxRunsPerWindow, windowMs, maxConcurrentRuns, now } = {}) {
    this.maxRunsPerWindow = maxRunsPerWindow;
    this.windowMs = windowMs;
    this.maxConcurrentRuns = maxConcurrentRuns;
    this.now = typeof now === 'function' ? now : () => Date.now();
    this.hits = new Map(); // userId -> timestamps[]
    this.inFlight = 0;
  }

  check(userId) {
    const cutoff = this.now() - this.windowMs;
    const timestamps = (this.hits.get(userId) || []).filter(t => t > cutoff);
    this.hits.set(userId, timestamps);
    if (timestamps.length >= this.maxRunsPerWindow) {
      const oldest = timestamps[0];
      return {
        allowed: false,
        retryAfterMs: Math.max(0, oldest + this.windowMs - this.now())
      };
    }
    timestamps.push(this.now());
    return { allowed: true };
  }

  tryAcquire() {
    if (this.inFlight >= this.maxConcurrentRuns) return false;
    this.inFlight += 1;
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.inFlight = Math.max(0, this.inFlight - 1);
      }
    };
  }
}

module.exports = { ExecutionRateLimiter };
