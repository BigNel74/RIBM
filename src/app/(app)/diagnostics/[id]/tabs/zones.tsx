import { scoreViolations } from "@/domain/scoring/score";
import { ActionForm, SelectField, SubmitButton, TextArea, TextField } from "@/ui/form";
import { EvidencePicker, EvidenceStateChip } from "@/ui/evidence";
import { DefinitionList, Panel, StatusChip } from "@/ui/primitives";
import { updateZoneAction } from "../../actions";
import { pickable, type TabProps } from "../types";

const SCORE_OPTIONS = Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
const CONFIDENCE_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

export function ZonesTab({ d, editable }: TabProps) {
  const r = d.scoringRules;
  const evidence = pickable(d);
  const stateById = new Map(d.evidence.map((e) => [e.id, e]));

  return (
    <div className="space-y-6">
      <p className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-bone-300">
        <span className="font-mono text-xs text-signal-gold">{d.scoringVersion.code}</span> · Scores are a consistency instrument, not a measurement. A score of {r.strongEvidenceThreshold}+ needs at least {r.strongEvidenceMinVerified} verified evidence item; {r.exceptionalThreshold}–{r.maxScore} needs {r.exceptionalMinVerified} verified items and a written justification. Visual polish never offsets broken conversion infrastructure.
      </p>
      {d.zoneScores.map((z) => {
        const linkedIds = z.evidence.map((e) => e.evidenceItemId);
        const linked = linkedIds.map((id) => stateById.get(id)).filter((e) => e !== undefined);
        // Re-checked on every view: a later evidence downgrade can invalidate an existing score.
        const violations = scoreViolations({ score: z.score, linkedEvidenceStates: linked.map((e) => e.evidenceState), justification: z.justification }, r);
        return (
          <Panel key={z.id} title={`${z.zoneDefinition.position}. ${z.zoneDefinition.name}`}>
            <div className="grid gap-6 lg:grid-cols-[10rem_1fr]">
              <div>
                <p className="text-xs uppercase tracking-wide text-bone-400">Score</p>
                <p className={`font-mono text-4xl ${z.score === null ? "text-bone-400" : violations.length ? "text-signal-red" : "text-bone-100"}`}>
                  {z.score ?? "—"}
                  <span className="text-base text-bone-400">/10</span>
                </p>
                <div className="mt-2">
                  <StatusChip>Confidence {z.confidence.toLowerCase()}</StatusChip>
                </div>
                <p className="mt-3 text-xs text-bone-400">{z.zoneDefinition.description}</p>
              </div>
              <div className="space-y-4">
                {violations.length ? (
                  <ul role="alert" className="space-y-1 rounded-md border border-signal-red/40 bg-signal-red/5 px-3 py-2 text-sm text-signal-red">
                    {violations.map((v) => (
                      <li key={v.code}>{v.message}</li>
                    ))}
                  </ul>
                ) : null}
                {linked.length ? (
                  <ul className="space-y-1 text-sm">
                    {linked.map((e) => (
                      <li key={e.id} className="flex flex-wrap items-center gap-2">
                        <EvidenceStateChip state={e.evidenceState} />
                        <span>{e.source}</span>
                        {e.capturedText ? <span className="line-clamp-1 text-xs text-bone-400">{e.capturedText}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-bone-400">No linked evidence.</p>
                )}
                {editable ? (
                  <div className="border-t border-ink-700 pt-4">
                      <ActionForm action={updateZoneAction.bind(null, d.id, z.id)}>
                        <div className="grid gap-4 md:grid-cols-3">
                          <SelectField name="score" label="Score (1–10)" placeholder="— Not scored —" options={SCORE_OPTIONS} defaultValue={z.score === null ? "" : String(z.score)} />
                          <SelectField name="confidence" label="Confidence" options={CONFIDENCE_OPTIONS} defaultValue={z.confidence} />
                          <TextField name="recommendedInterventionClass" label="Intervention class" defaultValue={z.recommendedInterventionClass} hint="e.g. Booking infrastructure" />
                        </div>
                        <TextArea name="diagnosis" label="Diagnosis" defaultValue={z.diagnosis} />
                        <TextField name="primaryWeakness" label="Primary weakness" defaultValue={z.primaryWeakness} />
                        <TextArea name="justification" label="Justification" defaultValue={z.justification} rows={2} hint={`Required for ${r.exceptionalThreshold}+.`} />
                        <EvidencePicker evidence={evidence} selected={linkedIds} />
                        <TextField name="changeReason" label="Reason for score change" hint="Required when changing an existing score. Kept in the audit log." />
                        <SubmitButton tone="secondary">Save zone</SubmitButton>
                      </ActionForm>
                  </div>
                ) : (
                  <DefinitionList
                    items={[
                      ["Diagnosis", z.diagnosis],
                      ["Primary weakness", z.primaryWeakness],
                      ["Intervention class", z.recommendedInterventionClass],
                      ["Justification", z.justification],
                    ]}
                  />
                )}
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
