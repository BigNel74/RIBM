import { z } from "zod";

/** Blank form strings become null; everything is trimmed and length-capped. */
export const optionalText = (max = 2000) =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v ?? null),
    z.string().max(max).nullable(),
  );

export const requiredText = (max = 200) => z.string({ error: "Required." }).trim().min(1, "Required.").max(max);

export const optionalUrl = z.preprocess(
  (v) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v ?? null),
  z.url({ protocol: /^https?$/, error: "Enter a full URL starting with http:// or https://" }).max(500).nullable(),
);

export const optionalEmail = z.preprocess(
  (v) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim().toLowerCase()) : v ?? null),
  z.email("Enter a valid email.").max(254).nullable(),
);

export const optionalId = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v ?? null),
  z.string().max(64).nullable(),
);

/** `<input type="date">` value (YYYY-MM-DD) → UTC midnight Date, or null. */
export const optionalDate = z.preprocess(
  (v) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v ?? null),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
    .transform((s) => new Date(`${s}T00:00:00.000Z`))
    .refine((d) => !Number.isNaN(d.getTime()), "Use a valid date.")
    .nullable(),
);

export function formToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && !k.startsWith("$ACTION")) out[k] = v;
  }
  return out;
}

export function toDateInput(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "";
}
