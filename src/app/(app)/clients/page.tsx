import type { Metadata } from "next";
import { requirePagePermission } from "@/server/auth/guards";
import { ModulePending, PageHeader } from "@/ui/primitives";

export const metadata: Metadata = { title: "Clients" };

export default async function Page() {
  await requirePagePermission("clients:read");
  return (
    <>
      <PageHeader eyebrow="Accounts" title="Clients" />
      <ModulePending
        phase="Phase 2"
        purpose="Client and contact records. Every client-scoped record is isolated by client."
        next={["Client profile and contacts with authority level and decision role", "Client portal invitations (CLIENT role bound to one client)"]}
      />
    </>
  );
}
