import { ActionButton, ActionForm, SelectField, SubmitButton, TextArea, TextField } from "@/ui/form";
import { EvidencePicker } from "@/ui/evidence";
import { Panel } from "@/ui/primitives";
import { createFixAction, deleteFixAction, moveFixAction, updateFixAction } from "../../actions";
import { pickable, type TabProps } from "../types";

type FixValues = { problem?: string; fix?: string; interventionClass?: string | null; zoneKey?: string | null; effort?: string | null };

function FixFields({ d, v = {}, selected = [] }: { d: TabProps["d"]; v?: FixValues; selected?: string[] }) {
  return (
    <>
      <TextArea name="problem" label="Problem" required defaultValue={v.problem} rows={2} />
      <TextArea name="fix" label="Fix" required defaultValue={v.fix} rows={2} hint="The minimum sufficient intervention." />
      <div className="grid gap-4 md:grid-cols-3">
        <TextField name="interventionClass" label="Intervention class" defaultValue={v.interventionClass} />
        <SelectField
          name="zoneKey"
          label="Zone"
          placeholder="— None —"
          options={d.zoneScores.map((z) => ({ value: z.zoneDefinition.key, label: z.zoneDefinition.name }))}
          defaultValue={v.zoneKey ?? null}
        />
        <TextField name="effort" label="Effort" defaultValue={v.effort} hint="e.g. 2 days" />
      </div>
      <EvidencePicker evidence={pickable(d)} selected={selected} />
    </>
  );
}

export function PlanTab({ d, editable }: TabProps) {
  const zoneName = new Map(d.zoneScores.map((z) => [z.zoneDefinition.key, z.zoneDefinition.name]));
  return (
    <div className="space-y-6">
      <Panel title="Priority plan">
        {d.priorityFixes.length === 0 ? <p className="text-sm text-bone-400">No priority fixes yet. Rank the highest-cost constraint first.</p> : null}
        <ol className="space-y-3">
          {d.priorityFixes.map((f, i) => (
            <li key={f.id} className="rounded-md border border-ink-700 bg-ink-950/40 p-3">
              <div className="flex flex-wrap items-start gap-3">
                <span className="font-mono text-2xl text-signal-gold">{f.rank}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{f.problem}</p>
                  <p className="mt-1 text-sm text-bone-300">{f.fix}</p>
                  <p className="mt-1 text-xs text-bone-400">
                    {[f.interventionClass, f.zoneKey ? zoneName.get(f.zoneKey) : null, f.effort, `${f.evidence.length} evidence`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {editable ? (
                  <div className="flex gap-1">
                    {i > 0 ? <ActionButton action={moveFixAction.bind(null, d.id, f.id, "up")}>↑ Up</ActionButton> : null}
                    {i < d.priorityFixes.length - 1 ? <ActionButton action={moveFixAction.bind(null, d.id, f.id, "down")}>↓ Down</ActionButton> : null}
                  </div>
                ) : null}
              </div>
              {editable ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-bone-300 underline-offset-4 hover:underline">Edit or delete</summary>
                  <div className="mt-3 space-y-3">
                    <ActionForm action={updateFixAction.bind(null, d.id, f.id)}>
                      <FixFields d={d} v={f} selected={f.evidence.map((e) => e.evidenceItemId)} />
                      <SubmitButton tone="secondary">Save fix</SubmitButton>
                    </ActionForm>
                    <ActionButton action={deleteFixAction.bind(null, d.id, f.id)} tone="danger" confirm="Delete this priority fix?">
                      Delete fix
                    </ActionButton>
                  </div>
                </details>
              ) : null}
            </li>
          ))}
        </ol>
      </Panel>
      {editable ? (
        <Panel title="Add priority fix">
          <ActionForm action={createFixAction.bind(null, d.id)} resetOnSuccess successMessage="Priority fix added.">
            <FixFields d={d} />
            <SubmitButton>Add fix</SubmitButton>
          </ActionForm>
        </Panel>
      ) : null}
    </div>
  );
}
