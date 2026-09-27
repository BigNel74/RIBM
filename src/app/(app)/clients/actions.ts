"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActionPermission } from "@/server/auth/guards";
import { createClient, createContact, updateClient, updateContact } from "@/server/clients/service";
import { failure, success, type ActionState } from "@/server/forms/action-state";
import { formToObject } from "@/server/forms/fields";

export async function createClientAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let id: string;
  try {
    const actor = await requireActionPermission("clients:write");
    id = (await createClient(actor, formToObject(formData))).id;
  } catch (e) {
    return failure(e);
  }
  redirect(`/clients/${id}`);
}

export async function updateClientAction(clientId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireActionPermission("clients:write");
    await updateClient(actor, clientId, formToObject(formData));
  } catch (e) {
    return failure(e);
  }
  revalidatePath(`/clients/${clientId}`);
  return success();
}

export async function createContactAction(clientId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireActionPermission("clients:write");
    await createContact(actor, clientId, formToObject(formData));
  } catch (e) {
    return failure(e);
  }
  revalidatePath(`/clients/${clientId}`);
  return success();
}

export async function updateContactAction(clientId: string, contactId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireActionPermission("clients:write");
    await updateContact(actor, contactId, formToObject(formData));
  } catch (e) {
    return failure(e);
  }
  revalidatePath(`/clients/${clientId}`);
  return success();
}
