import type { Permission } from "@/server/auth/permissions";

/** MVP 1 primary navigation (BD §4). Future modules are not listed until built. */
export const PRIMARY_NAV: ReadonlyArray<{ href: string; label: string; permission: Permission }> = [
  { href: "/command", label: "Command", permission: "command:read" },
  { href: "/opportunities", label: "Opportunities", permission: "opportunities:read" },
  { href: "/clients", label: "Clients", permission: "clients:read" },
  { href: "/diagnostics", label: "Diagnostics", permission: "diagnostics:read" },
  { href: "/validation", label: "Validation", permission: "validation:read" },
  { href: "/reports", label: "Reports", permission: "diagnostics:read" },
  { href: "/templates", label: "Templates", permission: "diagnostics:write" },
  { href: "/settings", label: "Settings", permission: "users:manage" },
];
