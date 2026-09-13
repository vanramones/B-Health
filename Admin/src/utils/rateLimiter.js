class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  isBlocked(identifier) {
    const now = Date.now();
    const userAttempts = this.attempts.get(identifier);

    if (!userAttempts) {
      return false;
    }

    const recentAttempts = userAttempts.filter(
      timestamp => now - timestamp < this.windowMs
    );

    if (recentAttempts.length >= this.maxAttempts) {
      const oldestAttempt = recentAttempts[0];
      const timeLeft = Math.ceil((this.windowMs - (now - oldestAttempt)) / 1000 / 60);
      return { blocked: true, timeLeft };
    }

    return false;
  }

  recordAttempt(identifier) {
    const now = Date.now();
    const userAttempts = this.attempts.get(identifier) || [];
    
    const recentAttempts = userAttempts.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    recentAttempts.push(now);
    this.attempts.set(identifier, recentAttempts);
  }

  reset(identifier) {
    this.attempts.delete(identifier);
  }

  cleanup() {
    const now = Date.now();
    for (const [identifier, timestamps] of this.attempts.entries()) {
      const recentAttempts = timestamps.filter(
        timestamp => now - timestamp < this.windowMs
      );
      if (recentAttempts.length === 0) {
        this.attempts.delete(identifier);
      } else {
        this.attempts.set(identifier, recentAttempts);
      }
    }
  }
}

export const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000);

setInterval(() => loginRateLimiter.cleanup(), 60 * 1000);
