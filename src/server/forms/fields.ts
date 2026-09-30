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

/**
 * Plain object from FormData. Keys in `arrayKeys` always become string arrays
 * (checkbox groups); other repeated keys keep the last value.
 */
export function formToObject(formData: FormData, arrayKeys: readonly string[] = []): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const k of arrayKeys) out[k] = [];
  for (const [k, v] of formData.entries()) {
    if (typeof v !== "string" || k.startsWith("$ACTION")) continue;
    if (arrayKeys.includes(k)) (out[k] as string[]).push(v);
    else out[k] = v;
  }
  return out;
}

/** Checkbox: present ("on"/"true") → true, absent → false. */
export const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

/** Optional integer within a range; blank → null. */
export const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? null : Number(v)) : v ?? null),
    z.number({ error: "Enter a whole number." }).int("Enter a whole number.").min(min).max(max).nullable(),
  );

/** Optional non-negative decimal (money, rates); blank → null. Commas and $ are ignored. */
export const optionalDecimal = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? null : Number(v.replace(/[$,\s]/g, ""))) : v ?? null),
    z.number({ error: "Enter a number." }).finite("Enter a number.").min(0, "Must be zero or more.").max(max).nullable(),
  );

export const idList = z.array(z.string().min(1).max(64)).max(200).default([]);

export function toDateInput(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "";
}
