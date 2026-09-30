import { ActionForm, SubmitButton, TextArea } from "@/ui/form";
import { DefinitionList, Panel } from "@/ui/primitives";
import { updateNarrativeAction } from "../../actions";
import type { TabProps } from "../types";

const FIELDS = [
  ["executiveDiagnosis", "Executive diagnosis", 4],
  ["revenueSpineStrength", "Revenue Spine strength", 3],
  ["biggestConstraint", "Biggest constraint", 3],
  ["recommendedInterventionDirection", "Recommended intervention direction", 3],
  ["implementationReadiness", "Implementation readiness", 3],
  ["measurementPlan", "Measurement plan", 3],
  ["nextDecision", "Next decision", 2],
  ["finalRecommendation", "Final recommendation", 3],
] as const;

export function SummaryTab({ d, editable }: TabProps) {
  return (
    <Panel title="Report narrative">
      <p className="mb-4 text-sm text-bone-400">These fields become the client report (Phase 4). State uncertainty explicitly; no invented metrics.</p>
      {editable ? (
        <ActionForm action={updateNarrativeAction.bind(null, d.id)}>
          {FIELDS.map(([name, label, rows]) => (
            <TextArea key={name} name={name} label={label} rows={rows} defaultValue={d[name]} />
          ))}
          <TextArea name="internalNotes" label="Internal notes" rows={3} defaultValue={d.internalNotes} hint="Never included in client reports." />
          <SubmitButton tone="secondary">Save narrative</SubmitButton>
        </ActionForm>
      ) : (
        <DefinitionList items={FIELDS.map(([name, label]) => [label, d[name]])} />
      )}
    </Panel>
  );
}
