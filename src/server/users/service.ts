import "server-only";
import { z } from "zod";
import { ROLES } from "@/domain/shared/enums";
import { DomainRuleError } from "@/domain/shared/errors";
import { writeAudit } from "../audit/log";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../auth/password";
import { assertPermission, type Actor } from "../auth/permissions";
import { db } from "../db";
import { optionalId, requiredText } from "../forms/fields";

const password = z.string().min(MIN_PASSWORD_LENGTH, `At least ${MIN_PASSWORD_LENGTH} characters.`).max(256);

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email.").max(254),
  name: requiredText(120),
  role: z.enum(ROLES),
  clientId: optionalId,
  password,
});

/**
 * ADMIN-only user management (A2). CLIENT accounts must be bound to exactly
 * one client; internal accounts to none (also enforced by a DB CHECK).
 */
export async function createUser(actor: Actor, raw: unknown) {
  assertPermission(actor, "users:manage");
  const input = createUserSchema.parse(raw);
  if (input.role === "CLIENT" && !input.clientId) throw new DomainRuleError("USER_CLIENT_REQUIRED", "Client accounts must be linked to a client.");
  const clientId = input.role === "CLIENT" ? input.clientId : null;
  const passwordHash = await hashPassword(input.password);
  return db.$transaction(async (tx) => {
    if (clientId && !(await tx.client.count({ where: { id: clientId } }))) throw new DomainRuleError("NOT_FOUND", "Client not found.");
    if (await tx.user.count({ where: { email: input.email } })) throw new DomainRuleError("USER_EMAIL_TAKEN", "A user with that email already exists.");
    const user = await tx.user.create({ data: { email: input.email, name: input.name, role: input.role, clientId, passwordHash } });
    await writeAudit({ userId: actor.id, entityType: "User", entityId: user.id, action: "CREATE", after: { email: user.email, role: user.role, clientId } }, tx);
    return user;
  });
}

/** Deactivating signs the user out everywhere. Admins cannot deactivate themselves. */
export async function setUserActive(actor: Actor, userId: string, active: boolean, reason: string) {
  assertPermission(actor, "users:manage");
  if (userId === actor.id && !active) throw new DomainRuleError("USER_SELF_DEACTIVATE", "You cannot deactivate your own account.");
  if (!reason.trim()) throw new DomainRuleError("USER_REASON_REQUIRED", "A reason is required.");
  return db.$transaction(async (tx) => {
    const u = await tx.user.findUnique({ where: { id: userId } });
    if (!u) throw new DomainRuleError("NOT_FOUND", "User not found.");
    await tx.user.update({ where: { id: userId }, data: { active } });
    if (!active) await tx.session.deleteMany({ where: { userId } });
    await writeAudit(
      { userId: actor.id, entityType: "User", entityId: userId, action: "PERMISSION_CHANGE", before: { active: u.active }, after: { active }, reason: reason.trim() },
      tx,
    );
  });
}

/** Sets a new password and signs the user out everywhere. The hash is redacted from the audit log. */
export async function resetPassword(actor: Actor, userId: string, rawPassword: unknown) {
  assertPermission(actor, "users:manage");
  const passwordHash = await hashPassword(password.parse(rawPassword));
  return db.$transaction(async (tx) => {
    const u = await tx.user.findUnique({ where: { id: userId } });
    if (!u) throw new DomainRuleError("NOT_FOUND", "User not found.");
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId } });
    await writeAudit({ userId: actor.id, entityType: "User", entityId: userId, action: "UPDATE", after: { passwordHash: "changed" }, reason: "Password reset by admin" }, tx);
  });
}
