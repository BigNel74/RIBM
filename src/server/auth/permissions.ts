import { DomainRuleError } from "@/domain/shared/errors";
import type { Role } from "@/domain/shared/enums";

/**
 * Single source of truth for authorization (ADR-005, DOMAIN_MODEL §5).
 * Enforced server-side in every action and loader. UI hiding is cosmetic.
 */
export const PERMISSIONS = [
  "command:read",
  "command:write",
  "clients:read",
  "clients:write",
  "opportunities:read",
  "opportunities:write",
  "evidence:read",
  "evidence:write",
  "evidence:verify",
  "diagnostics:read",
  "diagnostics:write",
  "qa:run",
  "diagnostics:finalize",
  "reports:publish",
  "reports:read_own",
  "validation:read",
  "validation:write",
  "claims:read",
  "claims:write",
  "claims:approve",
  "framework:manage",
  "offers:manage",
  "users:manage",
  "prompts:read",
  "audit:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const OPERATOR: readonly Permission[] = [
  "command:read",
  "command:write",
  "clients:read",
  "clients:write",
  "opportunities:read",
  "opportunities:write",
  "evidence:read",
  "evidence:write",
  "evidence:verify",
  "diagnostics:read",
  "diagnostics:write",
  "qa:run",
  "diagnostics:finalize",
  "reports:publish",
  "validation:read",
  "validation:write",
  "claims:read",
  "claims:write",
  "prompts:read",
];

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  ADMIN: new Set(PERMISSIONS.filter((p) => p !== "reports:read_own")),
  OPERATOR: new Set(OPERATOR),
  // 04 §3: may use approved outputs and manage deal stages; may not alter evidence or diagnostic history.
  SALES_ADVISOR: new Set<Permission>([
    "command:read",
    "clients:read",
    "opportunities:read",
    "opportunities:write",
    "evidence:read",
    "diagnostics:read",
    "validation:read",
    "claims:read",
  ]),
  // Assigned-scope access arrives with Installs (MVP 3).
  CONTRACTOR: new Set<Permission>(),
  CLIENT: new Set<Permission>(["reports:read_own"]),
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function permissionsFor(role: Role): Permission[] {
  return PERMISSIONS.filter((p) => ROLE_PERMISSIONS[role].has(p));
}

export interface Actor {
  id: string;
  role: Role;
  /** Set only for CLIENT users. */
  clientId: string | null;
}

export class AuthorizationError extends DomainRuleError {
  constructor(message = "You do not have access to this resource.") {
    super("FORBIDDEN", message);
    this.name = "AuthorizationError";
  }
}

export function assertPermission(actor: Actor, permission: Permission): void {
  if (!hasPermission(actor.role, permission)) throw new AuthorizationError();
}

/** Internal roles that may work across clients. */
const CROSS_CLIENT_ROLES: readonly Role[] = ["ADMIN", "OPERATOR", "SALES_ADVISOR"];

/**
 * Tenant/client isolation (A1). A CLIENT user can reach only their bound
 * client; an unbound CLIENT user reaches nothing. CONTRACTOR has no client
 * access until assignment exists (MVP 3).
 */
export function canAccessClient(actor: Actor, clientId: string): boolean {
  if (CROSS_CLIENT_ROLES.includes(actor.role)) return true;
  if (actor.role === "CLIENT") return actor.clientId !== null && actor.clientId === clientId;
  return false;
}

export function assertClientAccess(actor: Actor, clientId: string): void {
  if (!canAccessClient(actor, clientId)) throw new AuthorizationError();
}
