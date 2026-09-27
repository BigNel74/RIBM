import type { Metadata } from "next";
import { requirePagePermission } from "@/server/auth/guards";
import { ActionForm, SubmitButton } from "@/ui/form";
import { PageHeader, Panel } from "@/ui/primitives";
import { createClientAction } from "../actions";
import { ClientFields } from "../client-fields";

export const metadata: Metadata = { title: "New client" };

export default async function NewClientPage() {
  await requirePagePermission("clients:write");
  return (
    <>
      <PageHeader eyebrow="Accounts" title="New client" />
      <Panel>
        <ActionForm action={createClientAction}>
          <ClientFields />
          <SubmitButton>Create client</SubmitButton>
        </ActionForm>
      </Panel>
    </>
  );
}
