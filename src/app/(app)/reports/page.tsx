import type { Metadata } from "next";
import { requirePagePermission } from "@/server/auth/guards";
import { ModulePending, PageHeader } from "@/ui/primitives";

export const metadata: Metadata = { title: "Reports" };

export default async function Page() {
  await requirePagePermission("diagnostics:read");
  return (
    <>
      <PageHeader eyebrow="Client delivery" title="Reports" />
      <ModulePending
        phase="Phase 4"
        purpose="Client reports generated from one structured source, published only after QA passes, frozen at publish with every version ID."
        next={["Run QA · Prepare Client Report", "Private web report with print/PDF layout", "Mobile-first client view"]}
      />
    </>
  );
}
