"use client";

import { useState } from "react";
import { STAGE_LABELS } from "@/domain/opportunities/stage-rules";
import { OPPORTUNITY_STAGES, type OpportunityStage } from "@/domain/shared/enums";
import type { ActionState } from "@/server/forms/action-state";
import { ActionForm, SubmitButton, TextArea, TextField } from "@/ui/form";

/** Stage change with the conditional inputs the stage rules require. */
export function StageForm({
  action,
  current,
  qualificationGaps,
  enteringQualifiedFrom,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  current: OpportunityStage;
  qualificationGaps: string[];
  /** True when the current stage is not yet qualified. */
  enteringQualifiedFrom: boolean;
}) {
  const choices = OPPORTUNITY_STAGES.filter((s) => s !== current);
  // Default to the next stage in the sequence; reopening defaults to Target.
  const next = OPPORTUNITY_STAGES[OPPORTUNITY_STAGES.indexOf(current) + 1];
  const initialTo: OpportunityStage =
    current === "LOST" || current === "DISQUALIFIED" ? "TARGET" : next && next !== "LOST" && next !== "DEFERRED" && next !== "DISQUALIFIED" ? next : choices[0];
  const [to, setTo] = useState<OpportunityStage>(initialTo);
  const qualifiedTargets: OpportunityStage[] = ["QUALIFIED", "DIAGNOSTIC", "PRESCRIPTION_PENDING", "PROPOSAL", "WON"];
  const needsOverride = enteringQualifiedFrom && qualifiedTargets.includes(to) && qualificationGaps.length > 0;
  const reopening = current === "LOST" || current === "DISQUALIFIED";

  return (
    <ActionForm action={action} successMessage="Stage updated.">
      <div className="space-y-1">
        <label htmlFor="toStage" className="block text-xs font-medium uppercase tracking-wide text-bone-300">
          Move to
        </label>
        <select
          id="toStage"
          name="toStage"
          value={to}
          onChange={(e) => setTo(e.target.value as OpportunityStage)}
          className="w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm"
        >
          {choices.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {needsOverride ? (
        <div className="space-y-2 rounded-md border border-signal-gold/40 p-3">
          <p className="text-sm text-signal-gold">Qualification gate not met:</p>
          <ul className="list-disc pl-5 text-sm text-bone-300">
            {qualificationGaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
          <TextArea name="overrideReason" label="Override reason (audit-logged)" rows={2} hint="Leave blank to be blocked. Prefer fixing the gaps above." />
        </div>
      ) : null}

      {to === "DISQUALIFIED" ? <TextArea name="disqualificationReason" label="Disqualification reason" required rows={2} /> : null}
      {reopening ? <TextArea name="reason" label="Reason for reopening" required rows={2} /> : null}
      {!reopening && to !== "DISQUALIFIED" ? <TextArea name="reason" label="Note (optional)" rows={2} /> : null}

      {to !== "WON" && to !== "LOST" && to !== "DISQUALIFIED" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="nextAction" label="Next action" hint="Blank keeps the current next action." />
          <TextField name="nextActionDate" label="Next action date" type="date" hint={to === "DEFERRED" ? "Required to defer." : "Blank keeps the current date."} />
        </div>
      ) : null}

      <SubmitButton>Change stage</SubmitButton>
    </ActionForm>
  );
}
