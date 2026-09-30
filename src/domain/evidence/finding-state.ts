import { DomainRuleError } from "../shared/errors";
import type { EvidenceState } from "../shared/enums";

/**
 * A finding may not claim more certainty than its linked evidence supports
 * (Evidence before certainty; 04 §7 allowed uses).
 *
 * - VERIFIED finding        → at least one linked VERIFIED evidence item.
 * - CLIENT_PROVIDED finding → at least one linked VERIFIED or CLIENT_PROVIDED item.
 * - ASSUMPTION finding      → allowed without evidence; it is visibly an assumption.
 * - NOT_VERIFIED finding    → always allowed; renders "Not verified from available evidence."
 */
export function findingStateGap(claimed: EvidenceState, linked: readonly EvidenceState[]): string | null {
  if (claimed === "VERIFIED" && !linked.includes("VERIFIED")) {
    return "A finding marked Verified needs at least one linked verified evidence item.";
  }
  if (claimed === "CLIENT_PROVIDED" && !linked.some((s) => s === "VERIFIED" || s === "CLIENT_PROVIDED")) {
    return "A finding marked Client-provided needs linked client-provided or verified evidence.";
  }
  return null;
}

export function assertFindingState(claimed: EvidenceState, linked: readonly EvidenceState[]): void {
  const gap = findingStateGap(claimed, linked);
  if (gap) throw new DomainRuleError("FINDING_STATE_UNSUPPORTED", gap);
}
