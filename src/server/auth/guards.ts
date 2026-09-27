import "server-only";
import { redirect } from "next/navigation";
import { assertPermission, hasPermission, type Permission } from "./permissions";
import { getSessionUser, type SessionUser } from "./session";

/** For pages/layouts: redirect to login when unauthenticated. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** For pages: authenticated and permitted, else redirect (no information leak). */
export async function requirePagePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasPermission(user.role, permission)) redirect("/forbidden");
  return user;
}

/** For server actions and services: throws AuthorizationError. */
export async function requireActionPermission(permission: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  assertPermission(user, permission);
  return user;
}
