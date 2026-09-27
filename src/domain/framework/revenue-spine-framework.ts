import type { OfferStatus } from "../shared/enums";

/**
 * Seed content for the Revenue Spine framework (04 §7, BD §9, BD §14, C-05).
 * Names and order are doctrine. Descriptions are operator guidance only;
 * the source documents define no zone↔section mapping, so none is encoded.
 */

export const FRAMEWORK_VERSION = {
  code: "RS-FW-2.1",
  label: "Revenue Spine Framework 2.1 (validated source set, Sept 2026)",
  notes:
    "Seeded from docs 00–04 (VALIDATED). Title pages read v2.0/v4.0/v1.0 while filenames read v2.1/v4.1/v1.1 — see DECISIONS C-01. Founder adoption not yet recorded — see C-02.",
} as const;

export const SCORING_VERSION = {
  code: "RS-SC-1.0",
  label: "Scoring 1.0 — evidence thresholds (founder-confirmed 2026-09-27)",
  notes: "Thresholds per DECISIONS C-12 and C-13.",
} as const;

export const REPORT_TEMPLATE_VERSION = {
  code: "RS-RT-1.0",
  label: "Client Diagnostic Report — MVP 1 sequence",
  // BD §14 (DECISIONS C-07).
  sections: [
    "COVER",
    "EXECUTIVE_DIAGNOSIS",
    "REVENUE_SPINE_STRENGTH",
    "FIVE_ZONE_SCORECARD",
    "BIGGEST_CONSTRAINT",
    "EVIDENCE",
    "PRIORITY_PROBLEMS",
    "PRIORITY_FIXES",
    "RECOMMENDED_INTERVENTION_DIRECTION",
    "REVENUE_EXPOSURE_SCENARIO",
    "IMPLEMENTATION_READINESS",
    "MEASUREMENT_PLAN",
    "NEXT_DECISION",
  ],
} as const;

export const PROMPT_VERSION_PLACEHOLDER = {
  code: "RS-PR-0.0",
  purpose: "Placeholder. No generation is wired in MVP 1 foundation (ADR-010).",
  promptText: "",
} as const;

export const DIAGNOSTIC_ZONES = [
  { key: "BRAND_CLARITY", name: "Brand Clarity", description: "Whether the buyer can tell what this is, who it is for, and why it matters." },
  { key: "DIGITAL_PRESENCE", name: "Digital Presence", description: "How the buyer encounters the business across its digital surfaces, including mobile." },
  { key: "POSITIONING", name: "Positioning", description: "Offer specificity, differentiation, and local / market position." },
  { key: "CONTENT_COMMUNICATION", name: "Content & Communication", description: "Message, proof, and communication that move a buyer toward action." },
  { key: "SYSTEMS_INFRASTRUCTURE", name: "Systems & Infrastructure", description: "Action path, lead capture, response, follow-up, and measurement." },
] as const;

export const DIAGNOSTIC_SECTIONS = [
  { number: 1, key: "FIVE_SECOND_TEST", name: "Five-Second Test" },
  { number: 2, key: "REVENUE_SPINE_DIAGNOSIS", name: "Revenue Spine Diagnosis" },
  { number: 3, key: "ABOVE_THE_FOLD", name: "Above-the-Fold Audit" },
  { number: 4, key: "OFFER_CLARITY", name: "Offer Clarity" },
  { number: 5, key: "CTA_BOOKING_FLOW", name: "CTA & Booking / Purchase Flow" },
  { number: 6, key: "TRUST_PROOF", name: "Trust & Proof" },
  { number: 7, key: "LEAD_CAPTURE", name: "Lead Capture System" },
  { number: 8, key: "FOLLOW_UP_AUTOMATION", name: "Follow-Up & Automation" },
  { number: 9, key: "AI_INTEGRATION_OPPORTUNITIES", name: "AI Integration Opportunities" },
  { number: 10, key: "LOCAL_MARKET_POSITIONING", name: "Local / Market Positioning" },
  { number: 11, key: "MOBILE_SPEED", name: "Mobile & Speed Experience" },
  { number: 12, key: "REVENUE_LEAK_SCENARIO", name: "Revenue Leak / Exposure Scenario" },
  { number: 13, key: "PRIORITY_PLAN", name: "Priority Plan" },
  { number: 14, key: "IMPLEMENTATION_READINESS", name: "Implementation Readiness" },
  { number: 15, key: "FINAL_OUTPUT", name: "Final Output" },
] as const;

export interface OfferSeed {
  name: string;
  status: OfferStatus;
  aliases: string[];
  description: string;
}

/** DECISIONS C-04, C-05. */
export const OFFERS: readonly OfferSeed[] = [
  {
    name: "Revenue Spine Conversion Infrastructure",
    status: "PRIMARY",
    aliases: ["Revenue Spine Install — Local/Professional Service Edition", "Local/Professional Service Conversion Infrastructure"],
    description:
      "90-day wedge for high-value local and professional service businesses with an existing demand source: message + action path + response/follow-up + measurement.",
  },
  { name: "Revenue Spine Optimization", status: "POST_SALE", aliases: [], description: "Ongoing measurement and improvement after install. Sold only where a continuing job exists." },
  { name: "Revenue Spine Snapshot", status: "TEST", aliases: ["Free 15-minute audit"], description: "Free qualification conversation. Not a full diagnostic; no full report." },
  { name: "Revenue Spine Diagnostic (standalone)", status: "TEST", aliases: [], description: "Paid strategic diagnostic for larger/complex organizations. Test after initial proof." },
  { name: "Revenue Spine Sprint", status: "DEFERRED", aliases: [], description: "Fix one bounded leak. Deferred during the wedge window." },
  { name: "Revenue Spine Institutional", status: "DEFERRED", aliases: [], description: "Deploy method, training, and implementation across teams. Defer until core motion proven." },
  { name: "AI Operations", status: "DEFERRED", aliases: ["Operations/AI Edition"], description: "Broader operational/AI workflow expansion. Defer until core motion proven." },
  { name: "External Licensing / SaaS", status: "DEFERRED", aliases: [], description: "Only after repeatable services (01 §13 sequential expansion rule)." },
];
