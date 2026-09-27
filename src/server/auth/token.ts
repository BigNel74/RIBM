import { createHash, randomBytes } from "node:crypto";

/** 256-bit opaque session token for the cookie. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only this hash is persisted (Session.tokenHash). */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const SESSION_COOKIE = "ribm_session";
