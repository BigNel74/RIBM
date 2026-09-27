import { z } from "zod";
import { AUTHORITY_STATES, DEMAND_SOURCE_STATES, OPPORTUNITY_STAGES, URGENCY_LEVELS } from "@/domain/shared/enums";
import { optionalDate, optionalId, optionalText, requiredText } from "../forms/fields";

export const opportunityDetailsSchema = z.object({
  primaryContactId: optionalId,
  offerId: optionalId,
  businessObjective: optionalText(1000),
  problemHypothesis: optionalText(2000),
  economicContext: optionalText(2000),
  currentSystems: optionalText(2000),
  urgency: z.enum(URGENCY_LEVELS).default("UNKNOWN"),
  authorityState: z.enum(AUTHORITY_STATES).default("UNKNOWN"),
  budgetSignal: optionalText(1000),
  demandSourceState: z.enum(DEMAND_SOURCE_STATES).default("UNKNOWN"),
  nextAction: optionalText(500),
  nextActionDate: optionalDate,
});
export type OpportunityDetails = z.infer<typeof opportunityDetailsSchema>;

export const opportunityCreateSchema = opportunityDetailsSchema.extend({
  clientId: requiredText(64),
  // Every live opportunity carries a next action (01 §9).
  nextAction: requiredText(500),
  nextActionDate: optionalDate.refine((d) => d !== null, "Required."),
});

export const stageChangeSchema = z.object({
  toStage: z.enum(OPPORTUNITY_STAGES),
  reason: optionalText(1000),
  overrideReason: optionalText(1000),
  disqualificationReason: optionalText(1000),
  nextAction: optionalText(500),
  nextActionDate: optionalDate,
});
