import "server-only";
import type { Prisma } from "@prisma/client";
import { qaStatusAfterEdit } from "@/domain/diagnostics/lifecycle";
import { DomainRuleError } from "@/domain/shared/errors";
import { writeAudit } from "../audit/log";
import type { Actor } from "../auth/permissions";

type Tx = Prisma.TransactionClient;

/**
 * Every diagnostic mutation goes through here (invariants L1, L3):
 * a FINALIZED diagnostic is immutable, and any content edit after QA sends the
 * diagnostic back to NOT_READY so QA must run again. The reset is audit-logged.
 */
export async function beginDiagnosticEdit(tx: Tx, actor: Actor, diagnosticId: string) {
  const diagnostic = await tx.diagnostic.findUnique({
    where: { id: diagnosticId },
    select: { id: true, clientId: true, qaStatus: true, scoringVersionId: true },
  });
  if (!diagnostic) throw new DomainRuleError("NOT_FOUND", "Diagnostic not found.");
  const next = qaStatusAfterEdit(diagnostic.qaStatus); // throws when FINALIZED
  if (next !== diagnostic.qaStatus) {
    await tx.diagnostic.update({ where: { id: diagnosticId }, data: { qaStatus: next } });
    await writeAudit(
      {
        userId: actor.id,
        entityType: "Diagnostic",
        entityId: diagnosticId,
        action: "STATE_CHANGE",
        before: { qaStatus: diagnostic.qaStatus },
        after: { qaStatus: next },
        reason: "Content edited after QA — QA must run again.",
      },
      tx,
    );
  }
  return diagnostic;
}

/** Evidence ids must belong to this diagnostic. Returns their states in input order. */
export async function linkableEvidence(tx: Tx, diagnosticId: string, ids: readonly string[]) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const rows = await tx.evidenceItem.findMany({
    where: { id: { in: unique }, diagnosticId },
    select: { id: true, evidenceState: true },
  });
  if (rows.length !== unique.length) {
    throw new DomainRuleError("EVIDENCE_NOT_IN_DIAGNOSTIC", "Evidence can only be linked from this diagnostic.");
  }
  return rows;
}
