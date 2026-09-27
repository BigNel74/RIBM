import type { Metadata } from "next";
import { requirePagePermission } from "@/server/auth/guards";
import { db } from "@/server/db";
import { ActionForm, SubmitButton, TextArea } from "@/ui/form";
import { DataTable, PageHeader, Panel, StatusChip } from "@/ui/primitives";
import { recordAdoptionAction } from "./actions";

export const metadata: Metadata = { title: "Settings" };

const fmt = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "—");

const OFFER_TONE = { PRIMARY: "critical", TEST: "gold", POST_SALE: "neutral", DEFERRED: "neutral", RETIRED: "neutral" } as const;

export default async function SettingsPage() {
  await requirePagePermission("users:manage");

  const [users, frameworks, scoring, templates, offers] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, active: true, client: { select: { displayName: true } } },
    }),
    db.frameworkVersion.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        label: true,
        status: true,
        adoptedAt: true,
        adoptedBy: { select: { name: true } },
        _count: { select: { zones: true, sections: true } },
      },
    }),
    db.scoringVersion.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, code: true, label: true, status: true } }),
    db.reportTemplateVersion.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, code: true, label: true, status: true } }),
    db.offer.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, status: true, validationState: true } }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Settings" description="Users, methodology versions, and offer configuration. Version definitions are immutable once used." />

      <Panel title="Users">
        <DataTable
          columns={["Name", "Email", "Role", "Client", "Status"]}
          empty="No users."
          rows={users.map((u) => [
            u.name,
            <span key="e" className="font-mono text-xs">{u.email}</span>,
            <StatusChip key="r">{u.role.replace("_", " ")}</StatusChip>,
            u.client?.displayName ?? "—",
            u.active ? <StatusChip key="s" tone="verified">Active</StatusChip> : <StatusChip key="s">Inactive</StatusChip>,
          ])}
        />
      </Panel>

      <Panel title="Framework versions">
        <DataTable
          columns={["Code", "Label", "Zones", "Sections", "Status", "Founder adoption"]}
          empty="No framework versions. Run the seed."
          rows={frameworks.map((f) => [
            <span key="c" className="font-mono text-xs">{f.code}</span>,
            f.label,
            f._count.zones,
            f._count.sections,
            <StatusChip key="s" tone={f.status === "ACTIVE" ? "verified" : "neutral"}>{f.status}</StatusChip>,
            f.adoptedAt ? (
              <span key="a" className="text-sm">
                <StatusChip tone="verified">Adopted</StatusChip> <span className="font-mono text-xs">{fmt(f.adoptedAt)}</span>{" "}
                <span className="text-bone-400">by {f.adoptedBy?.name}</span>
              </span>
            ) : (
              <StatusChip key="a" tone="gold">Not recorded</StatusChip>
            ),
          ])}
        />
        {frameworks
          .filter((f) => f.status === "ACTIVE" && !f.adoptedAt)
          .map((f) => (
            <div key={f.id} className="mt-5 border-t border-ink-700 pt-4">
              <h3 className="text-sm font-semibold">Record founder adoption of {f.code}</h3>
              <p className="mt-1 max-w-2xl text-sm text-bone-400">
                Records that you formally adopt this framework version (DECISIONS C-02). The entry is attributed to your account and your statement is kept in the audit log. It can be recorded once.
              </p>
              <div className="mt-3 max-w-2xl">
                <ActionForm action={recordAdoptionAction.bind(null, f.id)} successMessage="Adoption recorded.">
                  <TextArea name="statement" label="Adoption statement" required rows={2} hint={`For example: "I adopt ${f.code} as the governing Revenue Spine framework."`} />
                  <SubmitButton>Record adoption</SubmitButton>
                </ActionForm>
              </div>
            </div>
          ))}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Scoring versions">
          <DataTable
            columns={["Code", "Label", "Status"]}
            empty="None."
            rows={scoring.map((s) => [<span key="c" className="font-mono text-xs">{s.code}</span>, s.label, <StatusChip key="s">{s.status}</StatusChip>])}
          />
        </Panel>
        <Panel title="Report template versions">
          <DataTable
            columns={["Code", "Label", "Status"]}
            empty="None."
            rows={templates.map((t) => [<span key="c" className="font-mono text-xs">{t.code}</span>, t.label, <StatusChip key="s">{t.status}</StatusChip>])}
          />
        </Panel>
      </div>

      <Panel title="Offers">
        <DataTable
          columns={["Offer", "Status", "Validation"]}
          empty="No offers."
          rows={offers.map((o) => [
            o.name,
            <StatusChip key="s" tone={OFFER_TONE[o.status]}>{o.status.replace("_", " ")}</StatusChip>,
            <StatusChip key="v" tone={o.validationState === "VALIDATED" ? "verified" : "gold"}>{o.validationState}</StatusChip>,
          ])}
        />
      </Panel>
    </>
  );
}
