/**
 * Pure construction of audit entries (BD §17). Kept separate from the writer
 * so the shape and the "reason required" rules are unit-testable.
 */

export const AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "STATE_CHANGE",
  "SCORE_CHANGE",
  "EVIDENCE_STATE_CHANGE",
  "FINALIZE",
  "PUBLISH",
  "APPROVE",
  "PERMISSION_CHANGE",
  "FRAMEWORK_CHANGE",
  "LOGIN",
  "LOGOUT",
  "LOGIN_FAILED",
] as const;
export type AuditActionName = (typeof AUDIT_ACTIONS)[number];

/** High-priority actions that must record why (BD §17 "reason when required"). */
const REASON_REQUIRED: ReadonlySet<AuditActionName> = new Set([
  "SCORE_CHANGE",
  "EVIDENCE_STATE_CHANGE",
  "PERMISSION_CHANGE",
  "FRAMEWORK_CHANGE",
]);

/** Keys never written to the audit log, wherever they appear. */
const REDACTED_KEYS = new Set(["passwordHash", "password", "tokenHash", "token", "promptText"]);

export interface AuditEntryInput {
  userId: string | null;
  entityType: string;
  entityId: string;
  action: AuditActionName;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
}

export interface AuditEntry {
  userId: string | null;
  entityType: string;
  entityId: string;
  action: AuditActionName;
  before: unknown;
  after: unknown;
  reason: string | null;
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, REDACTED_KEYS.has(k) ? "[REDACTED]" : redact(v)]),
    );
  }
  return value;
}

export function buildAuditEntry(input: AuditEntryInput): AuditEntry {
  const reason = input.reason?.trim() || null;
  if (REASON_REQUIRED.has(input.action) && !reason) {
    throw new Error(`Audit action ${input.action} requires a reason.`);
  }
  return {
    userId: input.userId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    before: input.before === undefined ? null : redact(input.before),
    after: input.after === undefined ? null : redact(input.after),
    reason,
  };
}
