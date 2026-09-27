import { z } from "zod";
import { AUTHORITY_LEVELS, DECISION_ROLES } from "@/domain/shared/enums";
import { optionalEmail, optionalText, optionalUrl, requiredText } from "../forms/fields";

export const clientInputSchema = z.object({
  legalName: requiredText(200),
  displayName: requiredText(120),
  website: optionalUrl,
  industry: optionalText(120),
  market: optionalText(120),
  location: optionalText(200),
  businessModel: optionalText(500),
  primaryObjective: optionalText(1000),
  notes: optionalText(5000),
});
export type ClientInput = z.infer<typeof clientInputSchema>;

export const contactInputSchema = z.object({
  name: requiredText(120),
  title: optionalText(120),
  email: optionalEmail,
  phone: optionalText(40),
  authorityLevel: z.enum(AUTHORITY_LEVELS).default("UNKNOWN"),
  decisionRole: z.enum(DECISION_ROLES).default("UNKNOWN"),
});
export type ContactInput = z.infer<typeof contactInputSchema>;
