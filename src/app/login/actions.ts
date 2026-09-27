"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { writeAudit } from "@/server/audit/log";
import { timingSafeDummyHash, verifyPassword } from "@/server/auth/password";
import { createSession, destroySession, getSessionUser } from "@/server/auth/session";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(256),
});

export interface LoginState {
  error: string | null;
}

const GENERIC_ERROR = "Email or password is incorrect.";

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: GENERIC_ERROR };
  const { email, password } = parsed.data;

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, role: true, clientId: true, active: true, passwordHash: true },
  });

  // Always run one bcrypt comparison so timing does not reveal whether the account exists.
  const ok = await verifyPassword(password, user?.passwordHash ?? (await timingSafeDummyHash()));
  const allowed = Boolean(user && ok && user.active && (user.role !== "CLIENT" || user.clientId));

  if (!user || !allowed) {
    await writeAudit({
      userId: user?.id ?? null,
      entityType: "User",
      entityId: user?.id ?? "unknown",
      action: "LOGIN_FAILED",
    });
    return { error: GENERIC_ERROR };
  }

  const h = await headers();
  await createSession(user.id, h.get("user-agent"));
  await writeAudit({ userId: user.id, entityType: "User", entityId: user.id, action: "LOGIN" });
  redirect(user.role === "CLIENT" ? "/portal" : "/command");
}

export async function logout(): Promise<void> {
  const user = await getSessionUser();
  await destroySession();
  if (user) await writeAudit({ userId: user.id, entityType: "User", entityId: user.id, action: "LOGOUT" });
  redirect("/login");
}
