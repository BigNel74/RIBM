import { DomainRuleError } from "../shared/errors";
import type { EvidenceState, Role } from "../shared/enums";

/**
 * Strength order used when combining evidence (weakest wins).
 * NOT_VERIFIED is not "weak evidence" — it is the absence of evidence.
 */
const STRENGTH: Record<EvidenceState, number> = {
  VERIFIED: 3,
  CLIENT_PROVIDED: 2,
  ASSUMPTION: 1,
  NOT_VERIFIED: 0,
};

export function weakestEvidenceState(states: readonly EvidenceState[]): EvidenceState {
  if (states.length === 0) return "NOT_VERIFIED";
  return states.reduce((weakest, s) => (STRENGTH[s] < STRENGTH[weakest] ? s : weakest));
}

const VERIFYING_ROLES: readonly Role[] = ["ADMIN", "OPERATOR"];

export interface EvidenceStateChange {
  from: EvidenceState;
  to: EvidenceState;
  actorRole: Role;
  /** Why the state is changing. Required for every change. */
  reason?: string | null;
  /** What was observed to justify VERIFIED: URL, file ref, or observation note. */
  verificationSource?: string | null;
}

/**
 * Invariant E1: evidence state changes are explicit, attributable events.
 * ASSUMPTION / NOT_VERIFIED never become VERIFIED without a verifying actor,
 * a reason, and a verification source. There is no automatic path.
 */
export function assertEvidenceStateChange(change: EvidenceStateChange): void {
  const { from, to, actorRole } = change;
  const reason = change.reason?.trim();
  const source = change.verificationSource?.trim();

  if (from === to) {
    throw new DomainRuleError("EVIDENCE_NO_CHANGE", "Evidence state is unchanged.");
  }
  if (!VERIFYING_ROLES.includes(actorRole)) {
    throw new DomainRuleError(
      "EVIDENCE_FORBIDDEN",
      "Only an Admin or Operator can change an evidence state.",
    );
  }
  if (!reason) {
    throw new DomainRuleError("EVIDENCE_REASON_REQUIRED", "A reason is required to change an evidence state.");
  }
  if (to === "VERIFIED" && !source) {
    throw new DomainRuleError(
      "EVIDENCE_SOURCE_REQUIRED",
      "Marking evidence VERIFIED requires the observed source (URL, file, or observation note).",
    );
  }
}

/** Label for a value whose state is shown to a reader. */
export function describeEvidenceState(state: EvidenceState, sourceLabel?: string | null): string {
  switch (state) {
    case "VERIFIED":
      return "Verified";
    case "CLIENT_PROVIDED":
      return sourceLabel ? `Client-provided (${sourceLabel})` : "Client-provided";
    case "ASSUMPTION":
      return "Assumption — used for scenario modeling only";
    case "NOT_VERIFIED":
      return "Not verified from available evidence.";
  }
}
