import type { Metadata } from "next";
import { requirePagePermission } from "@/server/auth/guards";
import { db } from "@/server/db";
import { ActionForm, SubmitButton } from "@/ui/form";
import { LinkButton, PageHeader, Panel } from "@/ui/primitives";
import { createOpportunityAction } from "../actions";
import { OpportunityDetailsFields } from "../details-fields";

export const metadata: Metadata = { title: "New opportunity" };

export default async function NewOpportunityPage(props: PageProps<"/opportunities/new">) {
  await requirePagePermission("opportunities:write");
  const { clientId } = await props.searchParams;

  const [clients, offers] = await Promise.all([
    db.client.findMany({ orderBy: { displayName: "asc" }, select: { id: true, displayName: true } }),
    db.offer.findMany({ where: { status: { not: "RETIRED" } }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, status: true } }),
  ]);

  const client = typeof clientId === "string" ? clients.find((c) => c.id === clientId) : undefined;

  // Step 1: pick the client (contacts depend on it).
  if (!client) {
    return (
      <>
        <PageHeader eyebrow="Qualification" title="New opportunity" description="Choose the client first." />
        <Panel>
          {clients.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-bone-400">Create a client before opening an opportunity.</p>
              <LinkButton href="/clients/new">New client</LinkButton>
            </div>
          ) : (
            <form method="get" className="flex flex-wrap items-end gap-3">
              <label className="block min-w-64 flex-1 space-y-1">
                <span className="block text-xs font-medium uppercase tracking-wide text-bone-300">Client</span>
                <select name="clientId" className="w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm">
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="rounded-md border border-ink-700 px-4 py-2 text-sm hover:border-bone-400">
                Continue
              </button>
            </form>
          )}
        </Panel>
      </>
    );
  }

  const contacts = await db.contact.findMany({ where: { clientId: client.id }, orderBy: { name: "asc" }, select: { id: true, name: true, title: true } });
  const primaryOffer = offers.find((o) => o.status === "PRIMARY");

  return (
    <>
      <PageHeader eyebrow="Qualification" title="New opportunity" description={`For ${client.displayName}. Opens in Target.`} />
      <Panel>
        <ActionForm action={createOpportunityAction}>
          <input type="hidden" name="clientId" value={client.id} />
          <OpportunityDetailsFields contacts={contacts} offers={offers} values={{ offerId: primaryOffer?.id ?? null }} />
          <SubmitButton>Create opportunity</SubmitButton>
        </ActionForm>
      </Panel>
    </>
  );
}
