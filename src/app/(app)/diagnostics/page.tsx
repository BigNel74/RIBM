import type { Metadata } from "next";
import Link from "next/link";
import { hasPermission } from "@/server/auth/permissions";
import { requirePagePermission } from "@/server/auth/guards";
import { listDiagnostics } from "@/server/diagnostics/service";
import { fmtDate } from "@/ui/labels";
import { DataTable, LinkButton, PageHeader, Panel } from "@/ui/primitives";
import { QaChip } from "./qa-chip";

export const metadata: Metadata = { title: "Diagnostics" };

export default async function DiagnosticsPage() {
  const user = await requirePagePermission("diagnostics:read");
  const rows = await listDiagnostics(user);
  return (
    <>
      <PageHeader
        eyebrow="Evidence → diagnosis"
        title="Diagnostics"
        description="Each diagnostic is pinned to the framework and scoring versions active when it was opened."
        actions={hasPermission(user.role, "diagnostics:write") ? <LinkButton href="/diagnostics/new">New diagnostic</LinkButton> : null}
      />
      <Panel>
        <DataTable
          columns={["Diagnostic", "Client", "QA", "Zones scored", "Sections complete", "Evidence", "Updated"]}
          empty="No diagnostics yet. Open one from a qualified opportunity."
          rows={rows.map((d) => [
            <Link key="t" href={`/diagnostics/${d.id}`} className="font-medium underline-offset-4 hover:underline">
              {d.title}
            </Link>,
            <Link key="c" href={`/clients/${d.client.id}`} className="underline-offset-4 hover:underline">
              {d.client.displayName}
            </Link>,
            <QaChip key="q" status={d.qaStatus} />,
            <span key="z" className="font-mono text-xs">{d.zoneScores.filter((z) => z.score !== null).length}/5</span>,
            <span key="s" className="font-mono text-xs">{d.sectionResults.filter((s) => s.status === "COMPLETE").length}/15</span>,
            d._count.evidence,
            <span key="u" className="font-mono text-xs text-bone-400">{fmtDate(d.updatedAt)}</span>,
          ])}
        />
      </Panel>
    </>
  );
}
