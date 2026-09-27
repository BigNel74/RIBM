import { z } from "zod";
import { DomainRuleError } from "@/domain/shared/errors";

export interface ActionState {
  ok: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
  /** Changes on every successful submit so forms can reset. */
  savedAt?: number;
}

export const initialActionState: ActionState = { ok: false, error: null, fieldErrors: {} };

export function success(): ActionState {
  return { ok: true, error: null, fieldErrors: {}, savedAt: Date.now() };
}

/**
 * Converts expected failures (validation, business rules, authorization) into
 * form state. Anything else is logged server-side and shown generically.
 */
export function failure(e: unknown): ActionState {
  if (e instanceof z.ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of e.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Fix the highlighted fields.", fieldErrors };
  }
  if (e instanceof DomainRuleError) return { ok: false, error: e.message, fieldErrors: {} };
  console.error(e);
  return { ok: false, error: "Something went wrong. Nothing was saved.", fieldErrors: {} };
}
