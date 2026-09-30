import { z } from "zod";
import { CONFIDENCE_LEVELS, EVIDENCE_STATES } from "@/domain/shared/enums";
import { checkbox, idList, optionalDecimal, optionalId, optionalInt, optionalText, optionalUrl, requiredText } from "../forms/fields";

export const diagnosticCreateSchema = z.object({
  clientId: requiredText(64),
  opportunityId: optionalId,
  title: requiredText(200),
});

export const intakeSchema = z.object({
  intakeObjective: optionalText(2_000),
  intakeWebsiteUrl: optionalUrl,
  intakeCurrentSystems: optionalText(2_000),
  intakeDemandSources: optionalText(2_000),
});

export const narrativeSchema = z.object({
  executiveDiagnosis: optionalText(5_000),
  revenueSpineStrength: optionalText(3_000),
  biggestConstraint: optionalText(3_000),
  recommendedInterventionDirection: optionalText(3_000),
  implementationReadiness: optionalText(3_000),
  measurementPlan: optionalText(3_000),
  nextDecision: optionalText(2_000),
  finalRecommendation: optionalText(3_000),
  internalNotes: optionalText(10_000),
});

export const zoneScoreSchema = z.object({
  score: optionalInt(1, 10),
  diagnosis: optionalText(5_000),
  primaryWeakness: optionalText(2_000),
  recommendedInterventionClass: optionalText(300),
  confidence: z.enum(CONFIDENCE_LEVELS).default("LOW"),
  justification: optionalText(3_000),
  evidenceIds: idList,
  /** Required when the numeric score changes (SCORE_CHANGE audit). */
  changeReason: optionalText(1_000),
});

export const sectionSchema = z.object({
  status: z.enum(["NOT_STARTED", "DRAFT", "COMPLETE"]),
  findingsSummary: optionalText(5_000),
  evidenceIds: idList,
});

export const findingSchema = z.object({
  statement: requiredText(2_000),
  sectionResultId: optionalId,
  isMaterial: checkbox,
  clientFacing: checkbox,
  evidenceState: z.enum(EVIDENCE_STATES).default("NOT_VERIFIED"),
  evidenceIds: idList,
});

const stateField = z.enum(EVIDENCE_STATES);
export const leakScenarioSchema = z.object({
  label: requiredText(200),
  averageClientValue: optionalDecimal(10_000_000),
  averageClientValueState: stateField.default("NOT_VERIFIED"),
  missedBookingsPerWeek: optionalDecimal(10_000),
  missedBookingsState: stateField.default("NOT_VERIFIED"),
  weeksPerMonth: optionalDecimal(5).refine((v) => v === null || v > 0, "Must be more than zero."),
  weeksPerMonthState: stateField.default("ASSUMPTION"),
  notes: optionalText(2_000),
});

export const priorityFixSchema = z.object({
  problem: requiredText(1_000),
  fix: requiredText(2_000),
  interventionClass: optionalText(300),
  zoneKey: optionalText(64),
  effort: optionalText(100),
  evidenceIds: idList,
});
