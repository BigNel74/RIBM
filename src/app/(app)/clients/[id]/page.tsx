import type { Metadata } from "next";
import Link from "next/link";
import { isOverdue, STAGE_LABELS } from "@/domain/opportunities/stage-rules";
import { hasPermission } from "@/server/auth/permissions";
import { requirePagePermission } from "@/server/auth/guards";
import { getClient } from "@/server/clients/service";
import { loadOr404 } from "@/server/pages";
import { ActionForm, SubmitButton } from "@/ui/form";
import { AUTHORITY_LEVEL_LABELS, DECISION_ROLE_LABELS, fmtDate } from "@/ui/labels";
import { DataTable, DefinitionList, LinkButton, PageHeader, Panel, StatusChip } from "@/ui/primitives";
import { createContactAction, updateClientAction, updateContactAction } from "../actions";
import { ClientFields } from "../client-fields";
import { ContactFields } from "../contact-fields";

export const metadata: Metadata = { title: "Client" };

export default async function ClientPage(props: PageProps<"/clients/[id]">) {
  const { id } = await props.params;
  const user = await requirePagePermission("clients:read");
  const client = await loadOr404(() => getClient(user, id));
  const canWrite = hasPermission(user.role, "clients:write");
  const canCreateOpp = hasPermission(user.role, "opportunities:write");
  const now = new Date();

  return (
    <>
      <PageHeader
        eyebrow="Client"
        title={client.displayName}
        description={client.legalName}
        actions={canCreateOpp ? <LinkButton href={`/opportunities/new?clientId=${client.id}`}>New opportunity</LinkButton> : null}
      />

      <Panel title="Opportunities">
        <DataTable
          columns={["Stage", "Objective", "Next action", "Due"]}
          empty="No opportunities for this client."
          rows={client.opportunities.map((o) => [
            <StatusChip key="s">{STAGE_LABELS[o.stage]}</StatusChip>,
            <Link key="o" href={`/opportunities/${o.id}`} className="underline-offset-4 hover:underline">
              {o.businessObjective ?? "Untitled opportunity"}
            </Link>,
            o.nextAction ?? "—",
            isOverdue(o.stage, o.nextActionDate, now) ? (
              <StatusChip key="d" tone="critical">Overdue {fmtDate(o.nextActionDate)}</StatusChip>
            ) : (
              <span key="d" className="font-mono text-xs">{fmtDate(o.nextActionDate)}</span>
            ),
          ])}
        />
      </Panel>

      <Panel title="Contacts">
        <div className="space-y-2">
          {client.contacts.length === 0 ? <p className="text-sm text-bone-400">No contacts yet.</p> : null}
          {client.contacts.map((c) => (
            <details key={c.id} className="rounded-md border border-ink-700 bg-ink-950/40">
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5 text-sm">
                <span className="font-medium">{c.name}</span>
                <span className="text-bone-400">{c.title ?? ""}</span>
                <StatusChip tone={c.authorityLevel === "DECISION_MAKER" ? "gold" : "neutral"}>{AUTHORITY_LEVEL_LABELS[c.authorityLevel]}</StatusChip>
                <span className="text-xs text-bone-400">{DECISION_ROLE_LABELS[c.decisionRole]}</span>
                <span className="font-mono text-xs text-bone-400">{[c.email, c.phone].filter(Boolean).join(" · ")}</span>
              </summary>
              {canWrite ? (
                <div className="border-t border-ink-700 p-3">
                  <ActionForm action={updateContactAction.bind(null, client.id, c.id)}>
                    <ContactFields values={c} />
                    <SubmitButton tone="secondary">Save contact</SubmitButton>
                  </ActionForm>
                </div>
              ) : null}
            </details>
          ))}
        </div>
        {canWrite ? (
          <div className="mt-5 border-t border-ink-700 pt-4">
            <h3 className="mb-3 text-sm font-semibold">Add contact</h3>
            <ActionForm action={createContactAction.bind(null, client.id)} resetOnSuccess successMessage="Contact added.">
              <ContactFields />
              <SubmitButton tone="secondary">Add contact</SubmitButton>
            </ActionForm>
          </div>
        ) : null}
      </Panel>

      <Panel title="Profile">
        {canWrite ? (
          <ActionForm action={updateClientAction.bind(null, client.id)}>
            <ClientFields values={client} />
            <SubmitButton tone="secondary">Save profile</SubmitButton>
          </ActionForm>
        ) : (
          <DefinitionList
            items={[
              ["Website", client.website],
              ["Industry", client.industry],
              ["Market", client.market],
              ["Location", client.location],
              ["Business model", client.businessModel],
              ["Primary objective", client.primaryObjective],
            ]}
          />
        )}
      </Panel>
    </>
  );
}
