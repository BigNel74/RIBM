/**
 * Failed-login throttle. In-memory and per process — correct for the single
 * web instance MVP 1 deploys (DEPLOY.md). A multi-instance deploy must move
 * this to the database or a shared store.
 */
export interface LoginThrottleOptions {
  maxFailures: number;
  windowMs: number;
}

export const LOGIN_THROTTLE: LoginThrottleOptions = { maxFailures: 5, windowMs: 15 * 60 * 1000 };

export class LoginThrottle {
  private failures = new Map<string, number[]>();

  constructor(private readonly opts: LoginThrottleOptions = LOGIN_THROTTLE) {}

  private recent(key: string, now: number): number[] {
    const list = (this.failures.get(key) ?? []).filter((t) => now - t < this.opts.windowMs);
    if (list.length) this.failures.set(key, list);
    else this.failures.delete(key);
    return list;
  }

  /** Milliseconds until another attempt is allowed; 0 when allowed now. */
  retryAfterMs(key: string, now = Date.now()): number {
    const list = this.recent(key, now);
    if (list.length < this.opts.maxFailures) return 0;
    return this.opts.windowMs - (now - list[list.length - this.opts.maxFailures]);
  }

  recordFailure(key: string, now = Date.now()): void {
    this.failures.set(key, [...this.recent(key, now), now]);
  }

  reset(key: string): void {
    this.failures.delete(key);
  }
}

/** Throttle key: account + client address, so one attacker cannot lock out everyone on an email from elsewhere cheaply. */
export function throttleKey(email: string, ip: string | null): string {
  return `${email.toLowerCase()}|${ip ?? "unknown"}`;
}
