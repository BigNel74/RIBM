import { describeEvidenceState } from "@/domain/evidence/evidence-state";
import { ActionButton, ActionForm, FileField, SelectField, SubmitButton, TextArea, TextField } from "@/ui/form";
import { EVIDENCE_STATE_OPTIONS, EvidenceStateChip } from "@/ui/evidence";
import { Panel } from "@/ui/primitives";
import { changeEvidenceStateAction, createEvidenceAction, deleteEvidenceAction, updateEvidenceAction } from "../../actions";
import type { TabProps } from "../types";

const TYPE_OPTIONS = [
  ["WEBSITE_OBSERVATION", "Website observation"],
  ["SCREENSHOT", "Screenshot"],
  ["CLIENT_STATEMENT", "Client statement"],
  ["DOCUMENT", "Document"],
  ["ANALYTICS_EXPORT", "Analytics export"],
  ["CALL_NOTE", "Call note"],
  ["THIRD_PARTY_LISTING", "Third-party listing"],
  ["OTHER", "Other"],
].map(([value, label]) => ({ value, label }));
const typeLabel = (t: string) => TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;

export function EvidenceTab({ d, editable, canVerify }: TabProps) {
  return (
    <div className="space-y-6">
      {editable ? (
        <Panel title="Capture evidence">
          <ActionForm action={createEvidenceAction.bind(null, d.id)} resetOnSuccess successMessage="Evidence captured.">
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField name="type" label="Type" options={TYPE_OPTIONS} defaultValue="WEBSITE_OBSERVATION" />
              <TextField name="source" label="Source" required hint='Where it came from, e.g. "Homepage, mobile" or "Owner call 9/28".' />
              <TextField name="sourceUrl" label="Source URL" type="url" placeholder="https://" />
              <FileField name="file" label="Screenshot or file" hint="PNG, JPEG, WebP, or PDF · up to 10 MB · stored privately." />
              <div className="md:col-span-2">
                <TextArea name="capturedText" label="What was observed or said" rows={3} hint="Exact text or a precise description. Quote clients verbatim." />
              </div>
              <SelectField name="evidenceState" label="Evidence state" options={EVIDENCE_STATE_OPTIONS} defaultValue="NOT_VERIFIED" hint="Verified needs a source URL or attached file." />
              <TextField name="stateReason" label="Basis for this state" hint="Required unless Not verified, e.g. “Observed directly on mobile”." />
              <div className="md:col-span-2">
                <TextArea name="operatorNotes" label="Internal notes" rows={2} hint="Never client-visible." />
              </div>
            </div>
            <SubmitButton>Capture evidence</SubmitButton>
          </ActionForm>
        </Panel>
      ) : null}

      <Panel title={`Evidence (${d.evidence.length})`}>
        {d.evidence.length === 0 ? <p className="text-sm text-bone-400">No evidence yet. Diagnosis waits for evidence.</p> : null}
        <ul className="space-y-3">
          {d.evidence.map((e) => (
            <li key={e.id} className="rounded-md border border-ink-700 bg-ink-950/40 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <EvidenceStateChip state={e.evidenceState} />
                <span className="font-medium">{e.source}</span>
                <span className="text-xs text-bone-400">{typeLabel(e.type)}</span>
                <span className="ml-auto font-mono text-xs text-bone-400">
                  {e.capturedBy.name} · {e.capturedAt.toISOString().slice(0, 16).replace("T", " ")}
                </span>
              </div>
              {e.capturedText ? <p className="mt-2 whitespace-pre-wrap text-sm text-bone-300">{e.capturedText}</p> : null}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {e.sourceUrl ? (
                  <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-signal-gold underline underline-offset-4">
                    {e.sourceUrl}
                  </a>
                ) : null}
                {e.fileRef ? (
                  <a href={`/api/evidence/${e.id}/file`} target="_blank" rel="noopener" className="text-signal-gold underline underline-offset-4">
                    {e.fileName} ({Math.ceil((e.fileSize ?? 0) / 1024)} KB)
                  </a>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-bone-400">
                {describeEvidenceState(e.evidenceState)}
                {e.stateChangeReason ? ` — ${e.stateChangeReason}` : ""}
              </p>
              {e.fileMimeType?.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element -- authenticated route; next/image would proxy it publicly
                <img src={`/api/evidence/${e.id}/file`} alt={`Evidence: ${e.source}`} className="mt-2 max-h-48 rounded border border-ink-700" />
              ) : null}

              {editable || canVerify ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-bone-300 underline-offset-4 hover:underline">Edit, change state, or delete</summary>
                  <div className="mt-3 grid gap-4 lg:grid-cols-2">
                    {canVerify ? (
                      <div className="rounded-md border border-ink-700 p-3">
                        <h4 className="mb-2 text-sm font-semibold">Change evidence state</h4>
                        <ActionForm action={changeEvidenceStateAction.bind(null, d.id, e.id)} successMessage="State changed.">
                          <SelectField name="to" label="New state" options={EVIDENCE_STATE_OPTIONS.filter((o) => o.value !== e.evidenceState)} />
                          <TextField name="reason" label="Reason" required />
                          <TextField name="verificationSource" label="Verification source" hint="Required for Verified: URL, file, or what you observed." />
                          <SubmitButton tone="secondary">Change state</SubmitButton>
                        </ActionForm>
                      </div>
                    ) : null}
                    {editable ? (
                      <div className="rounded-md border border-ink-700 p-3">
                        <h4 className="mb-2 text-sm font-semibold">Edit content</h4>
                        <ActionForm action={updateEvidenceAction.bind(null, d.id, e.id)}>
                          <SelectField name="type" label="Type" options={TYPE_OPTIONS} defaultValue={e.type} />
                          <TextField name="source" label="Source" required defaultValue={e.source} />
                          <TextField name="sourceUrl" label="Source URL" type="url" defaultValue={e.sourceUrl} />
                          <TextArea name="capturedText" label="Observed / said" defaultValue={e.capturedText} />
                          <TextArea name="operatorNotes" label="Internal notes" defaultValue={e.operatorNotes} rows={2} />
                          <SubmitButton tone="secondary">Save</SubmitButton>
                        </ActionForm>
                        <div className="mt-3 border-t border-ink-700 pt-3">
                          <ActionButton action={deleteEvidenceAction.bind(null, d.id, e.id)} tone="danger" confirm="Delete this evidence? This cannot be undone.">
                            Delete evidence
                          </ActionButton>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
