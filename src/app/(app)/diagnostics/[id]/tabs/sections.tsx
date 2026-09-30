import { ActionForm, SelectField, SubmitButton, TextArea } from "@/ui/form";
import { EvidencePicker } from "@/ui/evidence";
import { Panel, StatusChip } from "@/ui/primitives";
import { updateSectionAction } from "../../actions";
import { pickable, type TabProps } from "../types";

const STATUS = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "DRAFT", label: "Draft" },
  { value: "COMPLETE", label: "Complete" },
];

export function SectionsTab({ d, editable }: TabProps) {
  const evidence = pickable(d);
  return (
    <Panel title="15-point Revenue Spine audit">
      <div className="space-y-2">
        {d.sectionResults.map((s) => (
          <details key={s.id} className="rounded-md border border-ink-700 bg-ink-950/40">
            <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
              <span className="w-7 font-mono text-xs text-signal-gold">{String(s.sectionDefinition.number).padStart(2, "0")}</span>
              <span className="font-medium">{s.sectionDefinition.name}</span>
              <StatusChip tone={s.status === "COMPLETE" ? "verified" : s.status === "DRAFT" ? "gold" : "neutral"}>
                {STATUS.find((x) => x.value === s.status)?.label}
              </StatusChip>
              <span className="text-xs text-bone-400">{s.evidence.length} evidence</span>
            </summary>
            <div className="border-t border-ink-700 p-3">
              {editable ? (
                <ActionForm action={updateSectionAction.bind(null, d.id, s.id)}>
                  <SelectField name="status" label="Status" options={STATUS} defaultValue={s.status} />
                  <TextArea name="findingsSummary" label="Summary" defaultValue={s.findingsSummary} rows={4} hint="Required to mark complete. Label assumptions; do not state unverified facts." />
                  <EvidencePicker evidence={evidence} selected={s.evidence.map((e) => e.evidenceItemId)} />
                  <SubmitButton tone="secondary">Save section</SubmitButton>
                </ActionForm>
              ) : (
                <p className="whitespace-pre-wrap text-sm text-bone-300">{s.findingsSummary ?? "No summary."}</p>
              )}
            </div>
          </details>
        ))}
      </div>
    </Panel>
  );
}
