/** Admin user management against PostgreSQL. */
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@/server/auth/permissions";
import { createUser, resetPassword, setUserActive } from "@/server/users/service";

const db = new PrismaClient();
const tag = `usrtest_${Date.now()}`;
let admin: Actor;
let clientId: string;

beforeAll(async () => {
  const a = await db.user.create({ data: { email: `${tag}-admin@test.local`, name: "Admin", role: "ADMIN", passwordHash: "x" } });
  admin = { id: a.id, role: "ADMIN", clientId: null };
  clientId = (await db.client.create({ data: { legalName: tag, displayName: tag } })).id;
});

afterAll(async () => {
  await db.session.deleteMany({ where: { user: { email: { startsWith: tag } } } });
  await db.user.updateMany({ where: { email: { startsWith: tag } }, data: { active: false } });
  await db.$disconnect();
});

describe("user management (A2)", () => {
  it("is ADMIN-only", async () => {
    const op: Actor = { id: "o", role: "OPERATOR", clientId: null };
    await expect(createUser(op, { email: `${tag}-x@test.local`, name: "x", role: "OPERATOR", password: "long-enough-pass" })).rejects.toThrow(/do not have access/);
  });

  it("binds CLIENT accounts to a client and never binds internal accounts", async () => {
    await expect(createUser(admin, { email: `${tag}-c0@test.local`, name: "c", role: "CLIENT", password: "long-enough-pass" })).rejects.toThrow(/linked to a client/);
    const c = await createUser(admin, { email: `${tag}-c1@test.local`, name: "Owner", role: "CLIENT", clientId, password: "long-enough-pass" });
    expect(c.clientId).toBe(clientId);
    const o = await createUser(admin, { email: `${tag}-o1@test.local`, name: "Op", role: "OPERATOR", clientId, password: "long-enough-pass" });
    expect(o.clientId).toBeNull();
    await expect(createUser(admin, { email: `${tag}-o1@test.local`, name: "Dup", role: "OPERATOR", password: "long-enough-pass" })).rejects.toThrow(/already exists/);
    await expect(createUser(admin, { email: `${tag}-s@test.local`, name: "s", role: "OPERATOR", password: "short" })).rejects.toThrow();
  });

  it("deactivation and password resets end every session; admins cannot deactivate themselves", async () => {
    const u = await createUser(admin, { email: `${tag}-d@test.local`, name: "D", role: "OPERATOR", password: "long-enough-pass" });
    await db.session.create({ data: { tokenHash: `${tag}-h1`, userId: u.id, expiresAt: new Date(Date.now() + 1e6) } });
    await resetPassword(admin, u.id, "another-long-pass");
    expect(await db.session.count({ where: { userId: u.id } })).toBe(0);

    await db.session.create({ data: { tokenHash: `${tag}-h2`, userId: u.id, expiresAt: new Date(Date.now() + 1e6) } });
    await expect(setUserActive(admin, u.id, false, " ")).rejects.toThrow(/reason/);
    await setUserActive(admin, u.id, false, "Left the company");
    expect(await db.session.count({ where: { userId: u.id } })).toBe(0);
    expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).active).toBe(false);
    await expect(setUserActive(admin, admin.id, false, "oops")).rejects.toThrow(/your own account/);

    const log = await db.auditLog.findFirstOrThrow({ where: { entityId: u.id, action: "UPDATE" } });
    expect(JSON.stringify(log.after)).not.toMatch(/\$2[aby]\$/); // no bcrypt hash in the audit log
  });
});
