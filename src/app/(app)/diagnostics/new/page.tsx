import type { Metadata } from "next";
import { STAGE_LABELS } from "@/domain/opportunities/stage-rules";
import { requirePagePermission } from "@/server/auth/guards";
import { db } from "@/server/db";
import { ActionForm, SelectField, SubmitButton, TextField } from "@/ui/form";
import { LinkButton, PageHeader, Panel } from "@/ui/primitives";
import { createDiagnosticAction } from "../actions";

export const metadata: Metadata = { title: "New diagnostic" };

export default async function NewDiagnosticPage(props: PageProps<"/diagnostics/new">) {
  await requirePagePermission("diagnostics:write");
  const { clientId } = await props.searchParams;
  const clients = await db.client.findMany({ orderBy: { displayName: "asc" }, select: { id: true, displayName: true } });
  const client = typeof clientId === "string" ? clients.find((c) => c.id === clientId) : undefined;

  if (!client) {
    return (
      <>
        <PageHeader eyebrow="Evidence → diagnosis" title="New diagnostic" description="Choose the client first." />
        <Panel>
          {clients.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-bone-400">Create a client before opening a diagnostic.</p>
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

  const opportunities = await db.opportunity.findMany({
    where: { clientId: client.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, businessObjective: true, stage: true },
  });

  return (
    <>
      <PageHeader eyebrow="Evidence → diagnosis" title="New diagnostic" description={`For ${client.displayName}. Pins the active framework and scoring versions.`} />
      <Panel>
        <ActionForm action={createDiagnosticAction}>
          <input type="hidden" name="clientId" value={client.id} />
          <TextField name="title" label="Title" required defaultValue={`${client.displayName} — Revenue Spine Diagnostic`} />
          <SelectField
            name="opportunityId"
            label="Opportunity"
            placeholder="— None —"
            defaultValue={opportunities.find((o) => o.stage === "QUALIFIED" || o.stage === "DIAGNOSTIC")?.id ?? null}
            options={opportunities.map((o) => ({ value: o.id, label: `${o.businessObjective ?? "Untitled"} · ${STAGE_LABELS[o.stage]}` }))}
          />
          <SubmitButton>Open diagnostic</SubmitButton>
        </ActionForm>
      </Panel>
    </>
  );
}
