import type { Metadata } from "next";
import Link from "next/link";
import { isOverdue, qualificationGaps, QUALIFIED_STAGES, STAGE_LABELS } from "@/domain/opportunities/stage-rules";
import { hasPermission } from "@/server/auth/permissions";
import { requirePagePermission } from "@/server/auth/guards";
import { db } from "@/server/db";
import { toDateInput } from "@/server/forms/fields";
import { getOpportunity, opportunityHistory } from "@/server/opportunities/service";
import { loadOr404 } from "@/server/pages";
import { ActionForm, SubmitButton } from "@/ui/form";
import { AUTHORITY_STATE_LABELS, DEMAND_SOURCE_LABELS, fmtDate, QUALIFICATION_LABELS, URGENCY_LABELS } from "@/ui/labels";
import { DefinitionList, PageHeader, Panel, StatusChip } from "@/ui/primitives";
import { changeStageAction, updateOpportunityAction } from "../actions";
import { OpportunityDetailsFields } from "../details-fields";
import { StageForm } from "./stage-form";

export const metadata: Metadata = { title: "Opportunity" };

const FIELD_LABELS: Record<string, string> = {
  primaryContactId: "primary contact",
  offerId: "offer",
  businessObjective: "objective",
  problemHypothesis: "problem hypothesis",
  economicContext: "economic context",
  currentSystems: "current systems",
  urgency: "urgency",
  authorityState: "decision authority",
  budgetSignal: "budget signal",
  demandSourceState: "demand source",
  nextAction: "next action",
  nextActionDate: "next action date",
};

const norm = (v: unknown) => (v instanceof Date ? v.toISOString() : v ?? null);

function describeChange(before: unknown, after: unknown): string {
  if (!after || typeof after !== "object") return "";
  const a = after as Record<string, unknown>;
  if ("stage" in a) return `Stage → ${STAGE_LABELS[a.stage as keyof typeof STAGE_LABELS] ?? String(a.stage)}`;
  const b = (before && typeof before === "object" ? before : {}) as Record<string, unknown>;
  const changed = Object.keys(a).filter((k) => JSON.stringify(norm(a[k])) !== JSON.stringify(norm(b[k])));
  return changed.length ? `Updated ${changed.map((k) => FIELD_LABELS[k] ?? k).join(", ")}` : "Saved with no changes";
}

export default async function OpportunityPage(props: PageProps<"/opportunities/[id]">) {
  const { id } = await props.params;
  const user = await requirePagePermission("opportunities:read");
  const opp = await loadOr404(() => getOpportunity(user, id));
  const canWrite = hasPermission(user.role, "opportunities:write");
  const [history, offers] = await Promise.all([
    opportunityHistory(user, id),
    db.offer.findMany({ where: { status: { not: "RETIRED" } }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, status: true } }),
  ]);
  const gaps = qualificationGaps(opp);
  const overdue = isOverdue(opp.stage, opp.nextActionDate, new Date());

  return (
    <>
      <PageHeader
        eyebrow={opp.client.displayName}
        title={opp.businessObjective ?? "Untitled opportunity"}
        actions={
          <div className="flex items-center gap-2">
            <StatusChip tone={opp.stage === "WON" ? "verified" : opp.stage === "PROPOSAL" ? "gold" : "neutral"}>{STAGE_LABELS[opp.stage]}</StatusChip>
            {opp.stage !== "QUALIFIED" && opp.stage !== "DISQUALIFIED" ? (
              <StatusChip tone={opp.qualificationState === "QUALIFIED" ? "verified" : opp.qualificationState === "DISQUALIFIED" ? "critical" : "neutral"}>
                {QUALIFICATION_LABELS[opp.qualificationState]}
              </StatusChip>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel title="Next action">
            <p className="text-sm">
              {opp.nextAction ?? <span className="text-bone-400">None set.</span>}{" "}
              <span className={`ml-2 font-mono text-xs ${overdue ? "text-signal-red" : "text-bone-400"}`}>
                {overdue ? "OVERDUE · " : ""}
                {fmtDate(opp.nextActionDate)}
              </span>
            </p>
            {opp.disqualificationReason ? <p className="mt-2 text-sm text-signal-red">Disqualified: {opp.disqualificationReason}</p> : null}
          </Panel>

          <Panel title="Qualification">
            {canWrite ? (
              <ActionForm action={updateOpportunityAction.bind(null, opp.id)}>
                <OpportunityDetailsFields
                  contacts={opp.client.contacts}
                  offers={offers}
                  values={{ ...opp, nextActionDate: toDateInput(opp.nextActionDate) }}
                />
                <SubmitButton tone="secondary">Save</SubmitButton>
              </ActionForm>
            ) : (
              <DefinitionList
                items={[
                  ["Primary contact", opp.primaryContact?.name],
                  ["Offer", opp.offer?.name],
                  ["Decision authority", AUTHORITY_STATE_LABELS[opp.authorityState]],
                  ["Demand source", DEMAND_SOURCE_LABELS[opp.demandSourceState]],
                  ["Urgency", URGENCY_LABELS[opp.urgency]],
                  ["Budget signal", opp.budgetSignal],
                  ["Problem hypothesis", opp.problemHypothesis],
                  ["Economic context", opp.economicContext],
                  ["Current systems", opp.currentSystems],
                ]}
              />
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          {canWrite && opp.stage !== "WON" ? (
            <Panel title="Change stage">
              <StageForm
                action={changeStageAction.bind(null, opp.id)}
                current={opp.stage}
                qualificationGaps={gaps}
                enteringQualifiedFrom={!QUALIFIED_STAGES.includes(opp.stage)}
              />
            </Panel>
          ) : null}

          <Panel title="History">
            {history.length === 0 ? (
              <p className="text-sm text-bone-400">No history.</p>
            ) : (
              <ol className="space-y-3">
                {history.map((h) => (
                  <li key={h.id} className="text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-bone-300">{h.action.replace("_", " ")}</span>
                      <span className="font-mono text-[11px] text-bone-400">{h.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>
                    </div>
                    <p className="text-bone-300">
                      {describeChange(h.before, h.after)} <span className="text-bone-400">· {h.user?.name ?? "system"}</span>
                    </p>
                    {h.reason ? <p className={h.reason.startsWith("QUALIFICATION OVERRIDE") ? "text-signal-gold" : "text-bone-400"}>{h.reason}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <p className="text-xs text-bone-400">
            <Link href={`/clients/${opp.client.id}`} className="underline underline-offset-4">
              ← {opp.client.displayName}
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
