import type { Metadata } from "next";
import { requirePagePermission } from "@/server/auth/guards";
import { ModulePending, PageHeader } from "@/ui/primitives";

export const metadata: Metadata = { title: "Templates" };

export default async function Page() {
  await requirePagePermission("diagnostics:write");
  return (
    <>
      <PageHeader eyebrow="Reusable assets" title="Templates" />
      <ModulePending
        phase="Phase 4"
        purpose="Versioned report templates. Changing a template creates a new version; published reports keep the one they were built with."
        next={["Report template RS-RT-1.0 is seeded (13-section MVP 1 sequence)"]}
      />
    </>
  );
}
