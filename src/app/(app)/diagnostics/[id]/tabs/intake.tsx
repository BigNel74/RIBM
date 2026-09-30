import Link from "next/link";
import { ActionForm, SubmitButton, TextArea, TextField } from "@/ui/form";
import { fmtDate } from "@/ui/labels";
import { DefinitionList, Panel } from "@/ui/primitives";
import { updateIntakeAction } from "../../actions";
import type { TabProps } from "../types";

export function IntakeTab({ d, editable }: TabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Panel title="Intake">
        {editable ? (
          <ActionForm action={updateIntakeAction.bind(null, d.id)}>
            <p className="text-sm text-bone-400">Intake is complete when every question has an answer. Record only what the client stated or what you observed.</p>
            <TextArea name="intakeObjective" label="Buyer objective" defaultValue={d.intakeObjective} />
            <TextField name="intakeWebsiteUrl" label="Website" type="url" placeholder="https://" defaultValue={d.intakeWebsiteUrl} />
            <TextArea name="intakeDemandSources" label="Demand sources" defaultValue={d.intakeDemandSources} hint="Traffic, referrals, ads, inquiries — as stated by the client." />
            <TextArea name="intakeCurrentSystems" label="Current systems" defaultValue={d.intakeCurrentSystems} hint="Booking, CRM, phone, follow-up tools." />
            <SubmitButton tone="secondary">Save intake</SubmitButton>
          </ActionForm>
        ) : (
          <DefinitionList
            items={[
              ["Buyer objective", d.intakeObjective],
              ["Website", d.intakeWebsiteUrl],
              ["Demand sources", d.intakeDemandSources],
              ["Current systems", d.intakeCurrentSystems],
            ]}
          />
        )}
      </Panel>
      <Panel title="Pinned versions">
        <DefinitionList
          items={[
            ["Framework", `${d.frameworkVersion.code} — ${d.frameworkVersion.label}`],
            ["Scoring", d.scoringVersion.code],
            ["Report template", d.reportTemplateVersion?.code],
            ["Prompt", d.promptVersion?.code ?? "None — manual diagnostic"],
            ["Intake complete", d.intakeCompletedAt ? fmtDate(d.intakeCompletedAt) : "No"],
            ["Opened by", `${d.createdBy.name}, ${fmtDate(d.createdAt)}`],
            [
              "Opportunity",
              d.opportunity ? (
                <Link href={`/opportunities/${d.opportunity.id}`} className="underline underline-offset-4">
                  {d.opportunity.businessObjective ?? "Untitled"}
                </Link>
              ) : null,
            ],
          ]}
        />
      </Panel>
    </div>
  );
}
