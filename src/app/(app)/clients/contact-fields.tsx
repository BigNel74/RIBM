import { SelectField, TextField } from "@/ui/form";
import { AUTHORITY_LEVEL_LABELS, DECISION_ROLE_LABELS, optionsFrom } from "@/ui/labels";

type ContactValues = Partial<Record<"name" | "title" | "email" | "phone" | "authorityLevel" | "decisionRole", string | null>>;

export function ContactFields({ values = {} }: { values?: ContactValues }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <TextField name="name" label="Name" required defaultValue={values.name} />
      <TextField name="title" label="Title" defaultValue={values.title} />
      <TextField name="email" label="Email" type="email" defaultValue={values.email} />
      <TextField name="phone" label="Phone" type="tel" defaultValue={values.phone} />
      <SelectField name="authorityLevel" label="Authority level" options={optionsFrom(AUTHORITY_LEVEL_LABELS)} defaultValue={values.authorityLevel ?? "UNKNOWN"} />
      <SelectField name="decisionRole" label="Decision role" options={optionsFrom(DECISION_ROLE_LABELS)} defaultValue={values.decisionRole ?? "UNKNOWN"} />
    </div>
  );
}
