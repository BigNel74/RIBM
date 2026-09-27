"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActionPermission } from "@/server/auth/guards";
import { failure, success, type ActionState } from "@/server/forms/action-state";
import { formToObject } from "@/server/forms/fields";
import { changeStage, createOpportunity, updateOpportunityDetails } from "@/server/opportunities/service";

export async function createOpportunityAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let id: string;
  try {
    const actor = await requireActionPermission("opportunities:write");
    id = (await createOpportunity(actor, formToObject(formData))).id;
  } catch (e) {
    return failure(e);
  }
  redirect(`/opportunities/${id}`);
}

export async function updateOpportunityAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireActionPermission("opportunities:write");
    await updateOpportunityDetails(actor, id, formToObject(formData));
  } catch (e) {
    return failure(e);
  }
  revalidatePath(`/opportunities/${id}`);
  return success();
}

export async function changeStageAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireActionPermission("opportunities:write");
    await changeStage(actor, id, formToObject(formData));
  } catch (e) {
    return failure(e);
  }
  revalidatePath(`/opportunities/${id}`);
  revalidatePath("/opportunities");
  return success();
}
