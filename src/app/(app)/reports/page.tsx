import type { Metadata } from "next";
import Link from "next/link";
import { requirePagePermission } from "@/server/auth/guards";
import { listReports } from "@/server/reports/service";
import { fmtDate } from "@/ui/labels";
import { DataTable, PageHeader, Panel, StatusChip } from "@/ui/primitives";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const user = await requirePagePermission("diagnostics:read");
  const reports = await listReports(user);
  return (
    <>
      <PageHeader
        eyebrow="Client delivery"
        title="Reports"
        description="Published reports are frozen snapshots. Publish from a diagnostic's QA & report tab once QA passes."
      />
      <Panel>
        <DataTable
          columns={["Client", "Diagnostic", "Status", "Published", "By"]}
          empty="No reports published yet."
          rows={reports.map((r) => [
            <Link key="c" href={`/clients/${r.client.id}`} className="underline-offset-4 hover:underline">
              {r.client.displayName}
            </Link>,
            <Link key="d" href={`/r/${r.id}`} className="font-medium underline-offset-4 hover:underline">
              {r.diagnostic.title}
            </Link>,
            <StatusChip key="s" tone={r.status === "PUBLISHED" ? "verified" : "neutral"}>{r.status}</StatusChip>,
            <span key="p" className="font-mono text-xs">{fmtDate(r.publishedAt)}</span>,
            r.publishedBy?.name ?? "—",
          ])}
        />
      </Panel>
    </>
  );
}
