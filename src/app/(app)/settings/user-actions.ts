"use server";

import { revalidatePath } from "next/cache";
import { requireActionPermission } from "@/server/auth/guards";
import { failure, success, type ActionState } from "@/server/forms/action-state";
import { formToObject } from "@/server/forms/fields";
import { createUser, resetPassword, setUserActive } from "@/server/users/service";

async function run(fn: (actor: Awaited<ReturnType<typeof requireActionPermission>>) => Promise<unknown>): Promise<ActionState> {
  try {
    await fn(await requireActionPermission("users:manage"));
  } catch (e) {
    return failure(e);
  }
  revalidatePath("/settings");
  return success();
}

export async function createUserAction(_p: ActionState, fd: FormData) {
  return run((a) => createUser(a, formToObject(fd)));
}
export async function setUserActiveAction(userId: string, active: boolean, _p: ActionState, fd: FormData) {
  const reason = fd.get("reason");
  return run((a) => setUserActive(a, userId, active, typeof reason === "string" ? reason : ""));
}
export async function resetPasswordAction(userId: string, _p: ActionState, fd: FormData) {
  return run((a) => resetPassword(a, userId, fd.get("password")));
}
