import type { Metadata } from "next";
import Link from "next/link";
import { isOverdue, LIVE_STAGES, STAGE_LABELS } from "@/domain/opportunities/stage-rules";
import { OPPORTUNITY_STAGES, type OpportunityStage } from "@/domain/shared/enums";
import { hasPermission } from "@/server/auth/permissions";
import { requirePagePermission } from "@/server/auth/guards";
import { listOpportunities } from "@/server/opportunities/service";
import { fmtDate, QUALIFICATION_LABELS } from "@/ui/labels";
import { DataTable, LinkButton, PageHeader, Panel, StatusChip } from "@/ui/primitives";

export const metadata: Metadata = { title: "Opportunities" };

export default async function OpportunitiesPage(props: PageProps<"/opportunities">) {
  const user = await requirePagePermission("opportunities:read");
  const { view } = await props.searchParams;
  const selected = typeof view === "string" && (OPPORTUNITY_STAGES as readonly string[]).includes(view) ? (view as OpportunityStage) : null;
  const showAll = view === "all";
  const stages = showAll ? undefined : selected ? [selected] : [...LIVE_STAGES];

  const opportunities = await listOpportunities(user, { stages });
  const now = new Date();
  const overdue = opportunities.filter((o) => isOverdue(o.stage, o.nextActionDate, now)).length;

  const tab = (href: string, label: string, active: boolean) => (
    <Link
      key={href}
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded px-2.5 py-1 text-xs uppercase tracking-wide ${active ? "bg-ink-850 text-bone-100" : "text-bone-400 hover:text-bone-100"}`}
    >
      {label}
    </Link>
  );

  return (
    <>
      <PageHeader
        eyebrow="Qualification"
        title="Opportunities"
        description="Sorted by next-action date. Every live opportunity carries a dated next action."
        actions={hasPermission(user.role, "opportunities:write") ? <LinkButton href="/opportunities/new">New opportunity</LinkButton> : null}
      />
      {overdue > 0 ? (
        <p role="status" className="rounded-md border border-signal-red/40 bg-signal-red/5 px-3 py-2 text-sm text-signal-red">
          {overdue} {overdue === 1 ? "opportunity has" : "opportunities have"} an overdue next action.
        </p>
      ) : null}
      <nav aria-label="Stage filter" className="flex flex-wrap gap-1">
        {tab("/opportunities", "Live", !showAll && !selected)}
        {OPPORTUNITY_STAGES.map((s) => tab(`/opportunities?view=${s}`, STAGE_LABELS[s], selected === s))}
        {tab("/opportunities?view=all", "All", showAll)}
      </nav>
      <Panel>
        <DataTable
          columns={["Client", "Stage", "Objective", "Qualification", "Next action", "Due"]}
          empty="No opportunities in this view."
          rows={opportunities.map((o) => [
            <Link key="c" href={`/clients/${o.client.id}`} className="underline-offset-4 hover:underline">
              {o.client.displayName}
            </Link>,
            <StatusChip key="s" tone={o.stage === "WON" ? "verified" : o.stage === "PROPOSAL" ? "gold" : "neutral"}>
              {STAGE_LABELS[o.stage]}
            </StatusChip>,
            <Link key="o" href={`/opportunities/${o.id}`} className="font-medium underline-offset-4 hover:underline">
              {o.businessObjective ?? "Untitled opportunity"}
            </Link>,
            QUALIFICATION_LABELS[o.qualificationState],
            o.nextAction ?? "—",
            isOverdue(o.stage, o.nextActionDate, now) ? (
              <StatusChip key="d" tone="critical">Overdue {fmtDate(o.nextActionDate)}</StatusChip>
            ) : (
              <span key="d" className="font-mono text-xs">{fmtDate(o.nextActionDate)}</span>
            ),
          ])}
        />
      </Panel>
    </>
  );
}
