import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { generateSessionToken, hashSessionToken } from "./token";

describe("session tokens", () => {
  it("are 256-bit and unique", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(Buffer.from(a, "base64url")).toHaveLength(32);
    expect(a).not.toBe(b);
  });

  it("are stored only as a deterministic SHA-256 hash that differs from the token", () => {
    const t = generateSessionToken();
    expect(hashSessionToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(t)).toBe(hashSessionToken(t));
    expect(hashSessionToken(t)).not.toContain(t);
  });
});

describe("passwords", () => {
  it("hash and verify", async () => {
    const h = await hashPassword("correct horse battery");
    expect(h).not.toContain("correct horse");
    expect(await verifyPassword("correct horse battery", h)).toBe(true);
    expect(await verifyPassword("wrong horse battery!", h)).toBe(false);
  });

  it("reject short passwords", async () => {
    await expect(hashPassword("short")).rejects.toThrow(/at least 12/);
  });
});
