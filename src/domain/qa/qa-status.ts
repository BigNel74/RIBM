import { DomainRuleError } from "../shared/errors";
import type { QaStatus } from "../shared/enums";

/** Invariant L1 — the diagnostic QA state machine. FINALIZED is terminal. */
const TRANSITIONS: Record<QaStatus, readonly QaStatus[]> = {
  NOT_READY: ["READY_FOR_QA"],
  READY_FOR_QA: ["QA_PASSED", "QA_FAILED", "NOT_READY"],
  QA_FAILED: ["READY_FOR_QA", "NOT_READY"],
  QA_PASSED: ["FINALIZED", "NOT_READY"],
  FINALIZED: [],
};

export function canTransitionQa(from: QaStatus, to: QaStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertQaTransition(from: QaStatus, to: QaStatus): void {
  if (!canTransitionQa(from, to)) {
    throw new DomainRuleError(
      from === "FINALIZED" ? "DIAGNOSTIC_FINALIZED" : "QA_INVALID_TRANSITION",
      from === "FINALIZED"
        ? "This diagnostic is finalized. Create a superseding diagnostic to make corrections."
        : `QA status cannot move from ${from} to ${to}.`,
    );
  }
}

/** Invariant L5 — a client report can only be published after QA passes. */
export function assertReportPublishable(qaStatus: QaStatus): void {
  if (qaStatus !== "QA_PASSED" && qaStatus !== "FINALIZED") {
    throw new DomainRuleError(
      "REPORT_QA_REQUIRED",
      `Client reports cannot be published until QA has passed (current status: ${qaStatus}).`,
    );
  }
}
