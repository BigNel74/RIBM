import { describe, expect, it } from "vitest";
import { LoginThrottle, throttleKey } from "./rate-limit";

describe("LoginThrottle", () => {
  const t0 = 1_000_000;
  it("blocks after 5 failures within 15 minutes and recovers after the window", () => {
    const th = new LoginThrottle({ maxFailures: 5, windowMs: 15 * 60_000 });
    const k = throttleKey("a@b.c", "1.2.3.4");
    for (let i = 0; i < 4; i++) th.recordFailure(k, t0 + i * 1000);
    expect(th.retryAfterMs(k, t0 + 5000)).toBe(0);
    th.recordFailure(k, t0 + 5000);
    expect(th.retryAfterMs(k, t0 + 6000)).toBeGreaterThan(0);
    expect(th.retryAfterMs(k, t0 + 15 * 60_000 + 1)).toBe(0);
  });

  it("resets on success and keys by email + address", () => {
    const th = new LoginThrottle({ maxFailures: 2, windowMs: 60_000 });
    const k = throttleKey("A@B.C", "ip");
    th.recordFailure(k, t0);
    th.recordFailure(k, t0);
    expect(th.retryAfterMs(k, t0)).toBeGreaterThan(0);
    expect(th.retryAfterMs(throttleKey("a@b.c", "other-ip"), t0)).toBe(0);
    th.reset(k);
    expect(th.retryAfterMs(k, t0)).toBe(0);
    expect(k).toBe("a@b.c|ip");
  });
});
