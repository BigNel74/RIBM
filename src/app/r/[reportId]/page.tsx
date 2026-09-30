import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/guards";
import { getReportForViewer } from "@/server/reports/service";
import { loadOr404 } from "@/server/pages";
import { ClientReport } from "@/ui/report/client-report";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Revenue Spine Report", robots: { index: false, follow: false } };

/** Private web report. Renders only the frozen snapshot (ADR-009). */
export default async function ReportPage(props: PageProps<"/r/[reportId]">) {
  const { reportId } = await props.params;
  const user = await requireUser();
  const report = await loadOr404(() => getReportForViewer(user, reportId));
  const internal = user.role !== "CLIENT";

  return (
    <div className="report-page">
      <div className="no-print mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 pt-4 text-sm text-[#5a574f]">
        <Link href={internal ? "/reports" : "/portal"} className="underline underline-offset-4">
          ← {internal ? "Reports" : "Your reports"}
        </Link>
        <PrintButton />
      </div>
      {report.status !== "PUBLISHED" ? (
        <p role="status" className="no-print mx-auto mt-3 max-w-3xl px-4 text-sm font-medium text-[#a61e25]">
          This report is {report.status.toLowerCase()} and is not visible to the client.
        </p>
      ) : null}
      <ClientReport s={report.snapshot} />
    </div>
  );
}
