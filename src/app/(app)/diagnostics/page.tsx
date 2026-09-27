import type { Metadata } from "next";
import { requirePagePermission } from "@/server/auth/guards";
import { ModulePending, PageHeader } from "@/ui/primitives";

export const metadata: Metadata = { title: "Diagnostics" };

export default async function Page() {
  await requirePagePermission("diagnostics:read");
  return (
    <>
      <PageHeader eyebrow="Evidence → diagnosis" title="Diagnostics" />
      <ModulePending
        phase="Phase 3"
        purpose="Evidence capture, five-zone scoring, the 15-section Revenue Spine audit, findings, exposure scenarios, and the priority plan — pinned to framework and scoring versions."
        next={["Analyze Evidence · Generate Diagnosis · Generate Priority Plan", "Scores of 7+ blocked without verified evidence", "Estimated revenue exposure with every input labeled"]}
      />
    </>
  );
}
