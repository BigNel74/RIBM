import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { buildAuditEntry, type AuditEntryInput } from "./entry";

type Tx = Prisma.TransactionClient;

/**
 * Append an audit entry. Pass the transaction client when logging a mutation
 * so the change and its audit record commit or roll back together.
 */
export async function writeAudit(input: AuditEntryInput, tx: Tx = db): Promise<void> {
  const e = buildAuditEntry(input);
  await tx.auditLog.create({
    data: {
      userId: e.userId,
      entityType: e.entityType,
      entityId: e.entityId,
      action: e.action,
      before: (e.before ?? undefined) as Prisma.InputJsonValue | undefined,
      after: (e.after ?? undefined) as Prisma.InputJsonValue | undefined,
      reason: e.reason,
    },
  });
}
