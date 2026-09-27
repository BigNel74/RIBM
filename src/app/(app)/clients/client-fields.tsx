import { TextArea, TextField } from "@/ui/form";

type ClientValues = Partial<Record<"legalName" | "displayName" | "website" | "industry" | "market" | "location" | "businessModel" | "primaryObjective" | "notes", string | null>>;

export function ClientFields({ values = {} }: { values?: ClientValues }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TextField name="displayName" label="Display name" required defaultValue={values.displayName} />
      <TextField name="legalName" label="Legal / business name" required defaultValue={values.legalName} />
      <TextField name="website" label="Website" type="url" placeholder="https://" defaultValue={values.website} />
      <TextField name="industry" label="Industry" defaultValue={values.industry} />
      <TextField name="market" label="Market" defaultValue={values.market} hint="e.g. Atlanta metro" />
      <TextField name="location" label="Location" defaultValue={values.location} />
      <div className="md:col-span-2">
        <TextArea name="businessModel" label="Business model" defaultValue={values.businessModel} rows={2} />
      </div>
      <div className="md:col-span-2">
        <TextArea name="primaryObjective" label="Primary objective" defaultValue={values.primaryObjective} rows={2} />
      </div>
      <div className="md:col-span-2">
        <TextArea name="notes" label="Internal notes" defaultValue={values.notes} rows={3} hint="Internal only. Never shown to the client." />
      </div>
    </div>
  );
}
