import { z } from "zod";
import { EVIDENCE_STATES } from "@/domain/shared/enums";
import { optionalText, optionalUrl, requiredText } from "../forms/fields";

export const EVIDENCE_TYPES = [
  "WEBSITE_OBSERVATION",
  "SCREENSHOT",
  "CLIENT_STATEMENT",
  "DOCUMENT",
  "ANALYTICS_EXPORT",
  "CALL_NOTE",
  "THIRD_PARTY_LISTING",
  "OTHER",
] as const;

export const evidenceContentSchema = z.object({
  type: z.enum(EVIDENCE_TYPES),
  source: requiredText(300),
  sourceUrl: optionalUrl,
  capturedText: optionalText(10_000),
  operatorNotes: optionalText(5_000),
});

export const evidenceCreateSchema = evidenceContentSchema.extend({
  evidenceState: z.enum(EVIDENCE_STATES).default("NOT_VERIFIED"),
  /** Basis for any initial state other than NOT_VERIFIED. */
  stateReason: optionalText(1_000),
});

export const evidenceStateChangeSchema = z.object({
  to: z.enum(EVIDENCE_STATES),
  reason: optionalText(1_000),
  verificationSource: optionalText(1_000),
});
