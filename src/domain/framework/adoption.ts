import { DomainRuleError } from "../shared/errors";

export interface AdoptableFramework {
  status: "DRAFT" | "ACTIVE" | "RETIRED";
  adoptedAt: Date | null;
}

/**
 * Founder adoption of a framework version (DECISIONS C-02). Recorded once, by
 * the signed-in Admin, with a written statement. Never automated.
 */
export function assertAdoptable(fw: AdoptableFramework, statement: string | null | undefined): void {
  if (fw.adoptedAt) {
    throw new DomainRuleError("FRAMEWORK_ALREADY_ADOPTED", "Adoption is already recorded for this framework version.");
  }
  if (fw.status !== "ACTIVE") {
    throw new DomainRuleError("FRAMEWORK_NOT_ACTIVE", "Only the active framework version can be adopted.");
  }
  if (!statement?.trim()) {
    throw new DomainRuleError("FRAMEWORK_ADOPTION_STATEMENT", "Write an adoption statement. It is stored in the audit log.");
  }
}
