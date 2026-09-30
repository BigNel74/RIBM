import type { Metadata } from "next";
import Link from "next/link";
import { hasPermission } from "@/server/auth/permissions";
import { requirePagePermission } from "@/server/auth/guards";
import { getDiagnostic } from "@/server/diagnostics/service";
import { loadOr404 } from "@/server/pages";
import { listQaRuns } from "@/server/qa/service";
import { listReports } from "@/server/reports/service";
import { PageHeader, StatusChip } from "@/ui/primitives";
import { QaChip } from "../qa-chip";
import { EvidenceTab } from "./tabs/evidence";
import { ExposureTab } from "./tabs/exposure";
import { FindingsTab } from "./tabs/findings";
import { IntakeTab } from "./tabs/intake";
import { PlanTab } from "./tabs/plan";
import { QaTab } from "./tabs/qa";
import { SectionsTab } from "./tabs/sections";
import { SummaryTab } from "./tabs/summary";
import { ZonesTab } from "./tabs/zones";

export const metadata: Metadata = { title: "Diagnostic" };

const TABS = ["intake", "evidence", "zones", "sections", "findings", "exposure", "plan", "summary", "qa"] as const;
type Tab = (typeof TABS)[number];

export default async function DiagnosticPage(props: PageProps<"/diagnostics/[id]">) {
  const { id } = await props.params;
  const { tab: rawTab } = await props.searchParams;
  const user = await requirePagePermission("diagnostics:read");
  const d = await loadOr404(() => getDiagnostic(user, id));
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "intake";

  const finalized = d.qaStatus === "FINALIZED";
  const props2 = { d, editable: !finalized && hasPermission(user.role, "diagnostics:write"), canVerify: !finalized && hasPermission(user.role, "evidence:verify") };

  const zonesScored = d.zoneScores.filter((z) => z.score !== null).length;
  const sectionsDone = d.sectionResults.filter((s) => s.status === "COMPLETE").length;
  const labels: Record<Tab, string> = {
    intake: `Intake${d.intakeCompletedAt ? " ✓" : ""}`,
    evidence: `Evidence · ${d.evidence.length}`,
    zones: `Five zones · ${zonesScored}/5`,
    sections: `15 sections · ${sectionsDone}/15`,
    findings: `Findings · ${d.findings.length}`,
    exposure: `Exposure · ${d.leakScenarios.length}`,
    plan: `Priority plan · ${d.priorityFixes.length}`,
    summary: "Summary",
    qa: "QA & report",
  };

  return (
    <>
      <PageHeader
        eyebrow={d.client.displayName}
        title={d.title}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <QaChip status={d.qaStatus} />
            <StatusChip tone="gold">{d.frameworkVersion.code}</StatusChip>
            <StatusChip>{d.scoringVersion.code}</StatusChip>
          </div>
        }
      />
      {finalized ? (
        <p role="status" className="rounded-md border border-signal-green/40 px-3 py-2 text-sm text-signal-green">
          Finalized {d.finalizedAt?.toISOString().slice(0, 10)}. This diagnostic is read-only; corrections require a superseding diagnostic.
        </p>
      ) : null}
      <nav aria-label="Diagnostic sections" className="flex flex-wrap gap-1 border-b border-ink-700 pb-2">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/diagnostics/${d.id}?tab=${t}`}
            aria-current={t === tab ? "page" : undefined}
            className={`rounded px-2.5 py-1.5 text-xs uppercase tracking-wide ${t === tab ? "bg-ink-850 text-bone-100 shadow-[inset_0_-2px_0_var(--color-signal-gold)]" : "text-bone-400 hover:text-bone-100"}`}
          >
            {labels[t]}
          </Link>
        ))}
      </nav>
      {tab === "intake" && <IntakeTab {...props2} />}
      {tab === "evidence" && <EvidenceTab {...props2} />}
      {tab === "zones" && <ZonesTab {...props2} />}
      {tab === "sections" && <SectionsTab {...props2} />}
      {tab === "findings" && <FindingsTab {...props2} />}
      {tab === "exposure" && <ExposureTab {...props2} />}
      {tab === "plan" && <PlanTab {...props2} />}
      {tab === "summary" && <SummaryTab {...props2} />}
      {tab === "qa" && (
        <QaTab
          {...props2}
          qaData={{
            runs: await listQaRuns(user, d.id),
            reports: await listReports(user, { diagnosticId: d.id }),
            canRunQa: hasPermission(user.role, "qa:run"),
            canFinalize: hasPermission(user.role, "diagnostics:finalize"),
            canPublish: hasPermission(user.role, "reports:publish"),
          }}
        />
      )}
    </>
  );
}
