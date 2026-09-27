import { DomainRuleError } from "../shared/errors";
import type { QaStatus } from "../shared/enums";
import { assertQaTransition } from "../qa/qa-status";

export interface VersionPins {
  frameworkVersionId: string | null;
  scoringVersionId: string | null;
  promptVersionId: string | null;
  reportTemplateVersionId: string | null;
}

/**
 * Invariant L4 — a diagnostic can only be finalized from QA_PASSED with every
 * methodology version pinned. The returned pins are what gets frozen.
 *
 * promptVersionId may be null only when no generation was used (manual mode);
 * the caller passes `generationUsed` so the rule is explicit, not implicit.
 */
export function assertFinalizable(
  qaStatus: QaStatus,
  pins: VersionPins,
  opts: { generationUsed: boolean },
): VersionPins {
  assertQaTransition(qaStatus, "FINALIZED");

  const missing: string[] = [];
  if (!pins.frameworkVersionId) missing.push("framework");
  if (!pins.scoringVersionId) missing.push("scoring");
  if (!pins.reportTemplateVersionId) missing.push("report template");
  if (opts.generationUsed && !pins.promptVersionId) missing.push("prompt");

  if (missing.length > 0) {
    throw new DomainRuleError(
      "DIAGNOSTIC_VERSIONS_MISSING",
      `Cannot finalize: missing ${missing.join(", ")} version.`,
    );
  }
  return { ...pins };
}

/**
 * Invariant L3 — edits to a finalized diagnostic are rejected. Returns the
 * next QA status for an edit to a non-finalized diagnostic: any content edit
 * after QA sends it back to NOT_READY so QA must run again.
 */
export function qaStatusAfterEdit(current: QaStatus): QaStatus {
  if (current === "FINALIZED") {
    throw new DomainRuleError(
      "DIAGNOSTIC_FINALIZED",
      "This diagnostic is finalized. Create a superseding diagnostic to make corrections.",
    );
  }
  return "NOT_READY";
}
