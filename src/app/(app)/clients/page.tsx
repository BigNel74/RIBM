import type { Metadata } from "next";
import Link from "next/link";
import { LIVE_STAGES } from "@/domain/opportunities/stage-rules";
import { hasPermission } from "@/server/auth/permissions";
import { requirePagePermission } from "@/server/auth/guards";
import { listClients } from "@/server/clients/service";
import { fmtDate } from "@/ui/labels";
import { DataTable, LinkButton, PageHeader, Panel } from "@/ui/primitives";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const user = await requirePagePermission("clients:read");
  const clients = await listClients(user);

  return (
    <>
      <PageHeader
        eyebrow="Accounts"
        title="Clients"
        description="Organizations under evaluation or engagement. Every record below is internal."
        actions={hasPermission(user.role, "clients:write") ? <LinkButton href="/clients/new">New client</LinkButton> : null}
      />
      <Panel>
        <DataTable
          columns={["Client", "Industry", "Market", "Contacts", "Live opportunities", "Updated"]}
          empty="No clients yet. Add the first account you are qualifying."
          rows={clients.map((c) => [
            <Link key="n" href={`/clients/${c.id}`} className="font-medium text-bone-100 underline-offset-4 hover:underline">
              {c.displayName}
            </Link>,
            c.industry ?? "—",
            c.market ?? "—",
            c._count.contacts,
            c.opportunities.filter((o) => LIVE_STAGES.includes(o.stage)).length,
            <span key="u" className="font-mono text-xs text-bone-400">{fmtDate(c.updatedAt)}</span>,
          ])}
        />
      </Panel>
    </>
  );
}
