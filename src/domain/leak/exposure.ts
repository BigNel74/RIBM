import type { EvidenceState } from "../shared/enums";
import { weakestEvidenceState } from "../evidence/evidence-state";

/**
 * Revenue leak / exposure scenario (03 §5, BD §12).
 *
 *   Average Client Value × Missed Bookings Per Week × Weeks Per Month
 *     = Estimated Monthly Revenue Exposure
 *
 * This is a decision aid, not a causal claim. The result always carries the
 * weakest evidence state of its inputs, and it is never computed from a
 * NOT_VERIFIED input (invariant R5).
 */

export const EXPOSURE_LABEL = "Estimated revenue exposure";

export interface ScenarioVariable {
  value: number | null;
  state: EvidenceState;
}

export interface LeakScenarioInput {
  averageClientValue: ScenarioVariable;
  missedBookingsPerWeek: ScenarioVariable;
  weeksPerMonth: ScenarioVariable;
}

export type LeakExposure =
  | {
      computed: true;
      label: typeof EXPOSURE_LABEL;
      estimatedMonthlyExposure: number;
      resultState: Exclude<EvidenceState, "NOT_VERIFIED">;
      /** True when any input is an assumption — must be presented as a scenario. */
      isScenario: boolean;
    }
  | {
      computed: false;
      label: typeof EXPOSURE_LABEL;
      resultState: "NOT_VERIFIED";
      missing: Array<keyof LeakScenarioInput>;
    };

/** Default Weeks Per Month from the doctrine formula ("× 4"), stored as an ASSUMPTION (DECISIONS C-16). */
export const DEFAULT_WEEKS_PER_MONTH: ScenarioVariable = { value: 4, state: "ASSUMPTION" };

export function computeLeakExposure(input: LeakScenarioInput): LeakExposure {
  const entries = Object.entries(input) as Array<[keyof LeakScenarioInput, ScenarioVariable]>;

  for (const [key, v] of entries) {
    if (v.value !== null && (!Number.isFinite(v.value) || v.value < 0)) {
      throw new RangeError(`${key} must be a non-negative number.`);
    }
  }

  const missing = entries.filter(([, v]) => v.value === null || v.state === "NOT_VERIFIED").map(([k]) => k);
  if (missing.length > 0) {
    return { computed: false, label: EXPOSURE_LABEL, resultState: "NOT_VERIFIED", missing };
  }

  const acvCents = Math.round(input.averageClientValue.value! * 100);
  const exposureCents = Math.round(acvCents * input.missedBookingsPerWeek.value! * input.weeksPerMonth.value!);
  const resultState = weakestEvidenceState(entries.map(([, v]) => v.state)) as Exclude<EvidenceState, "NOT_VERIFIED">;

  return {
    computed: true,
    label: EXPOSURE_LABEL,
    estimatedMonthlyExposure: exposureCents / 100,
    resultState,
    isScenario: resultState === "ASSUMPTION",
  };
}
