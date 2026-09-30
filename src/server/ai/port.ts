/**
 * Generation port (ADR-010, ADR-013). Domain and services depend on this
 * interface only; a vendor adapter implements it later behind a feature flag.
 *
 * Contract: every output is a DRAFT that lands in editable structured fields
 * in NOT_VERIFIED (or ASSUMPTION for scenario inputs) state. Nothing generated
 * is ever client-visible without operator review and QA.
 */
export interface EvidenceDraft {
  statement: string;
  /** Always NOT_VERIFIED on arrival; an operator verifies explicitly. */
  evidenceState: "NOT_VERIFIED";
  suggestedSectionKey: string | null;
}

export interface DiagnosticGenerator {
  analyzeEvidence(input: { diagnosticId: string; promptVersionId: string }): Promise<EvidenceDraft[]>;
}

/**
 * No generator is configured in MVP 1. The UI hides generation buttons while
 * this returns null rather than showing controls that do nothing.
 */
export function getDiagnosticGenerator(): DiagnosticGenerator | null {
  return null;
}
