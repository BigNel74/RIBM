import type { Metadata } from "next";
import { requirePagePermission } from "@/server/auth/guards";
import { ModulePending, PageHeader } from "@/ui/primitives";

export const metadata: Metadata = { title: "Opportunities" };

export default async function Page() {
  await requirePagePermission("opportunities:read");
  return (
    <>
      <PageHeader eyebrow="Qualification" title="Opportunities" />
      <ModulePending
        phase="Phase 2"
        purpose="Accounts moving through TARGET → DISQUALIFIED with authority, demand-source, and next-action discipline."
        next={["Stage changes audit-logged", "QUALIFIED requires known authority and a meaningful demand source (or a logged override)", "Every opportunity carries a next action and date"]}
      />
    </>
  );
}
