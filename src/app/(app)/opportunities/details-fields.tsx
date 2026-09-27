import { SelectField, TextArea, TextField } from "@/ui/form";
import { AUTHORITY_STATE_LABELS, DEMAND_SOURCE_LABELS, optionsFrom, URGENCY_LABELS } from "@/ui/labels";

type Values = Partial<
  Record<
    | "primaryContactId"
    | "offerId"
    | "businessObjective"
    | "problemHypothesis"
    | "economicContext"
    | "currentSystems"
    | "urgency"
    | "authorityState"
    | "budgetSignal"
    | "demandSourceState"
    | "nextAction"
    | "nextActionDate",
    string | null
  >
>;

export function OpportunityDetailsFields({
  values = {},
  contacts,
  offers,
}: {
  values?: Values;
  contacts: Array<{ id: string; name: string; title: string | null }>;
  offers: Array<{ id: string; name: string; status: string }>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <TextField name="businessObjective" label="Business objective" defaultValue={values.businessObjective} hint="What the buyer wants, in their words." />
      </div>
      <SelectField
        name="primaryContactId"
        label="Primary contact"
        placeholder="— None —"
        options={contacts.map((c) => ({ value: c.id, label: c.title ? `${c.name} (${c.title})` : c.name }))}
        defaultValue={values.primaryContactId}
      />
      <SelectField
        name="offerId"
        label="Offer"
        placeholder="— None —"
        options={offers.map((o) => ({ value: o.id, label: `${o.name} · ${o.status.replace("_", " ")}` }))}
        defaultValue={values.offerId}
      />
      <SelectField
        name="authorityState"
        label="Decision authority"
        options={optionsFrom(AUTHORITY_STATE_LABELS)}
        defaultValue={values.authorityState ?? "UNKNOWN"}
        hint="Must be known to qualify; confirmed before any proposal."
      />
      <SelectField
        name="demandSourceState"
        label="Demand source"
        options={optionsFrom(DEMAND_SOURCE_LABELS)}
        defaultValue={values.demandSourceState ?? "UNKNOWN"}
        hint="Conversion infrastructure needs existing demand. Meaningful is required to qualify."
      />
      <SelectField name="urgency" label="Urgency" options={optionsFrom(URGENCY_LABELS)} defaultValue={values.urgency ?? "UNKNOWN"} />
      <TextField name="budgetSignal" label="Budget / capability signal" defaultValue={values.budgetSignal} />
      <div className="md:col-span-2">
        <TextArea name="problemHypothesis" label="Problem hypothesis" defaultValue={values.problemHypothesis} rows={2} hint="A hypothesis, not a diagnosis. Diagnosis needs evidence." />
      </div>
      <TextArea name="economicContext" label="Economic context" defaultValue={values.economicContext} rows={2} hint="Client value, inquiry volume — only what the client stated." />
      <TextArea name="currentSystems" label="Current systems" defaultValue={values.currentSystems} rows={2} />
      <TextField name="nextAction" label="Next action" required defaultValue={values.nextAction} />
      <TextField name="nextActionDate" label="Next action date" type="date" required defaultValue={values.nextActionDate} />
    </div>
  );
}
