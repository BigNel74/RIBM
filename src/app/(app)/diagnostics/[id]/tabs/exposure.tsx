import type { EvidenceState } from "@/domain/shared/enums";
import { EXPOSURE_LABEL } from "@/domain/leak/exposure";
import { describeEvidenceState } from "@/domain/evidence/evidence-state";
import { ActionButton, ActionForm, SelectField, SubmitButton, TextArea, TextField } from "@/ui/form";
import { EVIDENCE_STATE_OPTIONS, EvidenceStateChip, money } from "@/ui/evidence";
import { Panel, StatusChip } from "@/ui/primitives";
import { createLeakAction, deleteLeakAction, updateLeakAction } from "../../actions";
import type { TabProps } from "../types";

type Values = {
  label?: string;
  averageClientValue?: unknown;
  averageClientValueState?: string;
  missedBookingsPerWeek?: unknown;
  missedBookingsState?: string;
  weeksPerMonth?: unknown;
  weeksPerMonthState?: string;
  notes?: string | null;
};
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

function ScenarioFields({ v = {} }: { v?: Values }) {
  return (
    <>
      <TextField name="label" label="Scenario" required defaultValue={v.label} hint="e.g. Missed after-hours calls" />
      <div className="grid gap-4 md:grid-cols-2">
        <TextField name="averageClientValue" label="Average client value ($)" defaultValue={str(v.averageClientValue)} hint="Client-provided only — never inferred." />
        <SelectField name="averageClientValueState" label="State" options={EVIDENCE_STATE_OPTIONS} defaultValue={v.averageClientValueState ?? "CLIENT_PROVIDED"} />
        <TextField name="missedBookingsPerWeek" label="Missed bookings per week" defaultValue={str(v.missedBookingsPerWeek)} />
        <SelectField name="missedBookingsState" label="State" options={EVIDENCE_STATE_OPTIONS} defaultValue={v.missedBookingsState ?? "ASSUMPTION"} />
        <TextField name="weeksPerMonth" label="Weeks per month" defaultValue={str(v.weeksPerMonth ?? 4)} />
        <SelectField name="weeksPerMonthState" label="State" options={EVIDENCE_STATE_OPTIONS} defaultValue={v.weeksPerMonthState ?? "ASSUMPTION"} />
      </div>
      <TextArea name="notes" label="Notes" defaultValue={v.notes} rows={2} />
    </>
  );
}

function Variable({ label, value, state }: { label: string; value: string; state: EvidenceState }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-bone-400">{label}</p>
      <p className="font-mono">{value}</p>
      <EvidenceStateChip state={state} />
    </div>
  );
}

export function ExposureTab({ d, editable }: TabProps) {
  return (
    <div className="space-y-6">
      <p className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-bone-300">
        Average client value × missed bookings per week × weeks per month = <strong>{EXPOSURE_LABEL.toLowerCase()}</strong>. A decision aid, not a claim of lost money. The result carries the weakest input state; any unverified input means no number.
      </p>
      {d.leakScenarios.map((s) => (
        <Panel key={s.id} title={s.label}>
          <div className="grid gap-4 sm:grid-cols-4">
            <Variable label="Avg client value" value={money(s.averageClientValue)} state={s.averageClientValueState} />
            <Variable label="Missed / week" value={str(s.missedBookingsPerWeek) || "—"} state={s.missedBookingsState} />
            <Variable label="Weeks / month" value={str(s.weeksPerMonth)} state={s.weeksPerMonthState} />
            <div>
              <p className="text-xs uppercase tracking-wide text-bone-400">{EXPOSURE_LABEL} / month</p>
              {s.estimatedMonthlyExposure !== null ? (
                <>
                  <p className="font-mono text-2xl text-signal-gold">{money(s.estimatedMonthlyExposure)}</p>
                  <div className="flex gap-1">
                    <EvidenceStateChip state={s.resultState} />
                    {s.resultState === "ASSUMPTION" ? <StatusChip>Scenario</StatusChip> : null}
                  </div>
                </>
              ) : (
                <p className="text-sm text-bone-400">{describeEvidenceState("NOT_VERIFIED")}</p>
              )}
            </div>
          </div>
          {s.notes ? <p className="mt-3 text-sm text-bone-300">{s.notes}</p> : null}
          {editable ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-bone-300 underline-offset-4 hover:underline">Edit or delete</summary>
              <div className="mt-3 space-y-3">
                <ActionForm action={updateLeakAction.bind(null, d.id, s.id)}>
                  <ScenarioFields v={s} />
                  <SubmitButton tone="secondary">Save scenario</SubmitButton>
                </ActionForm>
                <ActionButton action={deleteLeakAction.bind(null, d.id, s.id)} tone="danger" confirm="Delete this scenario?">
                  Delete scenario
                </ActionButton>
              </div>
            </details>
          ) : null}
        </Panel>
      ))}
      {d.leakScenarios.length === 0 ? <p className="text-sm text-bone-400">No exposure scenarios. Add one only where the client supplied the value inputs.</p> : null}
      {editable ? (
        <Panel title="Add exposure scenario">
          <ActionForm action={createLeakAction.bind(null, d.id)} resetOnSuccess successMessage="Scenario added.">
            <ScenarioFields />
            <SubmitButton>Add scenario</SubmitButton>
          </ActionForm>
        </Panel>
      ) : null}
    </div>
  );
}
