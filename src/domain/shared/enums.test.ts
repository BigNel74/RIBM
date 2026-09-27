import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as E from "./enums";

const schema = readFileSync(join(__dirname, "../../../prisma/schema.prisma"), "utf8");

function prismaEnum(name: string): string[] {
  const m = schema.match(new RegExp(`enum ${name} \\{([^}]*)\\}`));
  if (!m) throw new Error(`enum ${name} not found in schema`);
  return m[1].split("\n").map((l) => l.trim()).filter(Boolean);
}

describe("domain enums match prisma/schema.prisma", () => {
  it.each([
    ["Role", E.ROLES],
    ["EvidenceState", E.EVIDENCE_STATES],
    ["QaStatus", E.QA_STATUSES],
    ["OpportunityStage", E.OPPORTUNITY_STAGES],
    ["OfferStatus", E.OFFER_STATUSES],
    ["ValidationDecisionState", E.VALIDATION_DECISIONS],
    ["ConfidenceDimension", E.CONFIDENCE_DIMENSIONS],
    ["ConfidenceLevel", E.CONFIDENCE_LEVELS],
    ["ClaimType", E.CLAIM_TYPES],
    ["ClaimStatus", E.CLAIM_STATUSES],
  ] as const)("%s", (name, values) => {
    expect(prismaEnum(name)).toEqual([...values]);
  });
});
