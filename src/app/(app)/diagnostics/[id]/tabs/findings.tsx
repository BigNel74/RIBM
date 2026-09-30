import { describeEvidenceState } from "@/domain/evidence/evidence-state";
import { findingStateGap } from "@/domain/evidence/finding-state";
import { ActionButton, ActionForm, CheckboxField, SelectField, SubmitButton, TextArea } from "@/ui/form";
import { EVIDENCE_STATE_OPTIONS, EvidencePicker, EvidenceStateChip } from "@/ui/evidence";
import { Panel, StatusChip } from "@/ui/primitives";
import { createFindingAction, deleteFindingAction, updateFindingAction } from "../../actions";
import { pickable, type TabProps } from "../types";

type FindingValues = {
  statement?: string;
  sectionResultId?: string | null;
  evidenceState?: string;
  isMaterial?: boolean;
  clientFacing?: boolean;
};

function FindingFields({ d, values = {}, selected = [] }: { d: TabProps["d"]; values?: FindingValues; selected?: string[] }) {
  return (
    <>
      <TextArea name="statement" label="Finding" required defaultValue={values.statement} rows={2} hint="One atomic, checkable claim." />
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          name="sectionResultId"
          label="Section"
          placeholder="— None —"
          options={d.sectionResults.map((s) => ({ value: s.id, label: `${String(s.sectionDefinition.number).padStart(2, "0")} ${s.sectionDefinition.name}` }))}
          defaultValue={values.sectionResultId ?? null}
        />
        <SelectField name="evidenceState" label="Evidence state" options={EVIDENCE_STATE_OPTIONS} defaultValue={values.evidenceState ?? "NOT_VERIFIED"} hint="Cannot be more certain than the linked evidence." />
      </div>
      <div className="flex flex-wrap gap-6">
        <CheckboxField name="isMaterial" label="Material claim" defaultChecked={values.isMaterial ?? true} />
        <CheckboxField name="clientFacing" label="Client-facing" defaultChecked={values.clientFacing ?? true} />
      </div>
      <EvidencePicker evidence={pickable(d)} selected={selected} />
    </>
  );
}

export function FindingsTab({ d, editable }: TabProps) {
  const stateById = new Map(d.evidence.map((e) => [e.id, e.evidenceState]));
  const sectionName = new Map(d.sectionResults.map((s) => [s.id, `${String(s.sectionDefinition.number).padStart(2, "0")} ${s.sectionDefinition.name}`]));
  return (
    <div className="space-y-6">
      <Panel title={`Findings (${d.findings.length})`}>
        {d.findings.length === 0 ? <p className="text-sm text-bone-400">No findings yet. Each material claim in the report should be a finding with its evidence.</p> : null}
        <ul className="space-y-3">
          {d.findings.map((f) => {
            const ids = f.evidence.map((e) => e.evidenceItemId);
            const gap = findingStateGap(f.evidenceState, ids.map((id) => stateById.get(id)!).filter(Boolean));
            const unsupported = f.isMaterial && f.clientFacing && ids.length === 0 && f.evidenceState !== "ASSUMPTION";
            return (
              <li key={f.id} className="rounded-md border border-ink-700 bg-ink-950/40 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <EvidenceStateChip state={f.evidenceState} />
                  {f.isMaterial ? <StatusChip tone="gold">Material</StatusChip> : null}
                  {!f.clientFacing ? <StatusChip>Internal</StatusChip> : null}
                  {f.sectionResultId ? <span className="text-xs text-bone-400">{sectionName.get(f.sectionResultId)}</span> : null}
                  <span className="ml-auto text-xs text-bone-400">{ids.length} evidence</span>
                </div>
                <p className="mt-2 text-sm">{f.statement}</p>
                {f.evidenceState === "NOT_VERIFIED" ? <p className="mt-1 text-xs text-bone-400">{describeEvidenceState("NOT_VERIFIED")}</p> : null}
                {gap || unsupported ? (
                  <p role="alert" className="mt-2 text-xs text-signal-red">
                    {gap ?? "Material client-facing claim with no evidence. Link evidence or label it an assumption — QA will block it."}
                  </p>
                ) : null}
                {editable ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-bone-300 underline-offset-4 hover:underline">Edit or delete</summary>
                    <div className="mt-3 space-y-3">
                      <ActionForm action={updateFindingAction.bind(null, d.id, f.id)}>
                        <FindingFields d={d} values={f} selected={ids} />
                        <SubmitButton tone="secondary">Save finding</SubmitButton>
                      </ActionForm>
                      <ActionButton action={deleteFindingAction.bind(null, d.id, f.id)} tone="danger" confirm="Delete this finding?">
                        Delete finding
                      </ActionButton>
                    </div>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Panel>
      {editable ? (
        <Panel title="Add finding">
          <ActionForm action={createFindingAction.bind(null, d.id)} resetOnSuccess successMessage="Finding added.">
            <FindingFields d={d} />
            <SubmitButton>Add finding</SubmitButton>
          </ActionForm>
        </Panel>
      ) : null}
    </div>
  );
}
