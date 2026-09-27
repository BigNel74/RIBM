import "server-only";
import { cookies } from "next/headers";
import { db } from "../db";
import type { Actor } from "./permissions";
import { generateSessionToken, hashSessionToken, SESSION_COOKIE, SESSION_TTL_MS } from "./token";

export interface SessionUser extends Actor {
  name: string;
  email: string;
}

export async function createSession(userId: string, userAgent: string | null): Promise<void> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({
    data: { tokenHash: hashSessionToken(token), userId, expiresAt, userAgent: userAgent?.slice(0, 256) ?? null },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Resolves the session cookie against the database. Expired or inactive → null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      id: true,
      expiresAt: true,
      user: { select: { id: true, name: true, email: true, role: true, clientId: true, active: true } },
    },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now() || !session.user.active) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  const { user } = session;
  // A CLIENT account without a client binding has no access at all (A1).
  if (user.role === "CLIENT" && !user.clientId) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role, clientId: user.clientId };
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  }
  jar.delete(SESSION_COOKIE);
}
