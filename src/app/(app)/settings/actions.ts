"use server";

import { revalidatePath } from "next/cache";
import { requireActionPermission } from "@/server/auth/guards";
import { failure, success, type ActionState } from "@/server/forms/action-state";
import { recordFrameworkAdoption } from "@/server/framework/service";

export async function recordAdoptionAction(frameworkVersionId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireActionPermission("framework:manage");
    const statement = formData.get("statement");
    await recordFrameworkAdoption(actor, frameworkVersionId, typeof statement === "string" ? statement : "");
  } catch (e) {
    return failure(e);
  }
  revalidatePath("/settings");
  return success();
}
