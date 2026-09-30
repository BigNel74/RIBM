import Link from "next/link";
import type { QaCheck } from "@/domain/qa/diagnostic-qa";
import { ActionButton, ActionForm, CheckboxField, SubmitButton, TextArea, TextField } from "@/ui/form";
import { Panel, StatusChip } from "@/ui/primitives";
import { finalizeAction, publishReportAction, runQaAction, withdrawReportAction } from "../../actions";
import type { TabProps } from "../types";

export interface QaTabData {
  runs: Array<{ id: string; resultStatus: string; checks: unknown; notes: string | null; createdAt: Date; runBy: { name: string } }>;
  reports: Array<{ id: string; status: string; publishedAt: Date | null; publishedBy: { name: string } | null }>;
  canRunQa: boolean;
  canFinalize: boolean;
  canPublish: boolean;
}

export function QaTab({ d, qaData }: TabProps & { qaData: QaTabData }) {
  const latest = qaData.runs[0];
  const checks = (latest?.checks ?? []) as QaCheck[];
  const passed = d.qaStatus === "QA_PASSED" || d.qaStatus === "FINALIZED";
  const finalized = d.qaStatus === "FINALIZED";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <Panel title="QA checklist">
          {latest ? (
            <>
              <p className="mb-3 text-sm text-bone-400">
                Last run by {latest.runBy.name}, {latest.createdAt.toISOString().slice(0, 16).replace("T", " ")} ·{" "}
                <StatusChip tone={latest.resultStatus === "QA_PASSED" ? "verified" : "critical"}>{latest.resultStatus === "QA_PASSED" ? "Passed" : "Failed"}</StatusChip>
                {d.qaStatus === "NOT_READY" ? <span className="ml-2 text-signal-gold">Content changed since — run QA again.</span> : null}
              </p>
              <ul className="space-y-1.5">
                {checks.map((c) => (
                  <li key={c.key} className="flex gap-2 text-sm">
                    <span aria-hidden className={c.passed ? "text-signal-green" : "text-signal-red"}>
                      {c.passed ? "✓" : "✗"}
                    </span>
                    <span>
                      <span className="sr-only">{c.passed ? "Passed: " : "Failed: "}</span>
                      {c.label}
                      {!c.passed && c.detail ? <span className="block text-xs text-signal-red">{c.detail}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-bone-400">QA has not been run.</p>
          )}
        </Panel>

        {qaData.canRunQa && !passed ? (
          <Panel title="Run QA">
            <ActionForm action={runQaAction.bind(null, d.id)} successMessage="QA run recorded.">
              <p className="text-sm text-bone-400">QA checks the diagnostic against the checklist. It passes only when every check passes; there is no override.</p>
              <CheckboxField name="noFabricatedMetrics" label="I attest that no metric in this diagnostic was invented." />
              <CheckboxField name="aestheticsNotOverRewarded" label="I attest that scores do not reward visual polish over broken conversion infrastructure." />
              <TextArea name="notes" label="QA notes" rows={2} />
              <SubmitButton>Run QA</SubmitButton>
            </ActionForm>
          </Panel>
        ) : null}
      </div>

      <div className="space-y-6">
        <Panel title="Client report">
          {!passed ? (
            <p className="text-sm text-bone-400">Publishing unlocks when QA passes.</p>
          ) : (
            <div className="space-y-3">
              {qaData.canPublish ? (
                <ActionButton action={publishReportAction.bind(null, d.id)} confirm="Publish a client report from the current diagnostic? Any earlier report for this diagnostic will be withdrawn.">
                  Prepare &amp; publish client report
                </ActionButton>
              ) : null}
              {qaData.canFinalize && !finalized ? (
                <div className="border-t border-ink-700 pt-3">
                  <p className="mb-2 text-xs text-bone-400">Finalizing freezes the diagnostic and its versions. Corrections then need a superseding diagnostic.</p>
                  <ActionButton action={finalizeAction.bind(null, d.id)} tone="danger" confirm="Finalize this diagnostic? It becomes read-only.">
                    Finalize diagnostic
                  </ActionButton>
                </div>
              ) : null}
            </div>
          )}
          {qaData.reports.length ? (
            <ul className="mt-4 space-y-3 border-t border-ink-700 pt-3">
              {qaData.reports.map((r) => (
                <li key={r.id} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/r/${r.id}`} className="underline underline-offset-4">
                      Report {r.publishedAt?.toISOString().slice(0, 10)}
                    </Link>
                    <StatusChip tone={r.status === "PUBLISHED" ? "verified" : "neutral"}>{r.status}</StatusChip>
                  </div>
                  {r.status === "PUBLISHED" && qaData.canPublish ? (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-bone-400">Withdraw</summary>
                      <ActionForm action={withdrawReportAction.bind(null, d.id, r.id)} successMessage="Withdrawn.">
                        <TextField name="reason" label="Reason" required />
                        <SubmitButton tone="secondary">Withdraw report</SubmitButton>
                      </ActionForm>
                    </details>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>

        {qaData.runs.length > 1 ? (
          <Panel title="QA history">
            <ul className="space-y-1 text-xs text-bone-400">
              {qaData.runs.map((r) => (
                <li key={r.id}>
                  {r.createdAt.toISOString().slice(0, 16).replace("T", " ")} · {r.runBy.name} · {r.resultStatus === "QA_PASSED" ? "passed" : "failed"}
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
