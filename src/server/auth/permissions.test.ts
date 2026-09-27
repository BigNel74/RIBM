import { describe, expect, it } from "vitest";
import { assertClientAccess, assertPermission, canAccessClient, hasPermission, permissionsFor, type Actor } from "./permissions";

const admin: Actor = { id: "u1", role: "ADMIN", clientId: null };
const operator: Actor = { id: "u2", role: "OPERATOR", clientId: null };
const clientA: Actor = { id: "u3", role: "CLIENT", clientId: "client_a" };
const unboundClient: Actor = { id: "u4", role: "CLIENT", clientId: null };
const sales: Actor = { id: "u5", role: "SALES_ADVISOR", clientId: null };
const contractor: Actor = { id: "u6", role: "CONTRACTOR", clientId: null };

describe("OPERATOR cannot change Admin-only settings (A2)", () => {
  it.each(["framework:manage", "offers:manage", "users:manage", "claims:approve", "audit:read"] as const)("denies %s", (p) => {
    expect(hasPermission("OPERATOR", p)).toBe(false);
    expect(() => assertPermission(operator, p)).toThrow(/do not have access/);
  });

  it("allows ADMIN all admin permissions", () => {
    expect(() => assertPermission(admin, "framework:manage")).not.toThrow();
    expect(() => assertPermission(admin, "claims:approve")).not.toThrow();
  });

  it("allows OPERATOR the diagnostic workflow", () => {
    for (const p of ["evidence:verify", "qa:run", "reports:publish", "diagnostics:finalize"] as const) {
      expect(hasPermission("OPERATOR", p)).toBe(true);
    }
  });
});

describe("CLIENT cannot access another client's data (A1)", () => {
  it("allows a client user their own client only", () => {
    expect(canAccessClient(clientA, "client_a")).toBe(true);
    expect(canAccessClient(clientA, "client_b")).toBe(false);
    expect(() => assertClientAccess(clientA, "client_b")).toThrow();
  });

  it("denies an unbound client user everything", () => {
    expect(canAccessClient(unboundClient, "client_a")).toBe(false);
  });

  it("gives CLIENT only report access — no prompts, internal data, or sales logic", () => {
    expect(permissionsFor("CLIENT")).toEqual(["reports:read_own"]);
  });

  it("denies CONTRACTOR client access until assignments exist", () => {
    expect(canAccessClient(contractor, "client_a")).toBe(false);
    expect(permissionsFor("CONTRACTOR")).toEqual([]);
  });
});

describe("SALES_ADVISOR cannot alter evidence or diagnostic history (04 §3)", () => {
  it.each(["evidence:write", "evidence:verify", "diagnostics:write", "qa:run", "reports:publish"] as const)("denies %s", (p) => {
    expect(() => assertPermission(sales, p)).toThrow();
  });
  it("can advance opportunities", () => {
    expect(hasPermission("SALES_ADVISOR", "opportunities:write")).toBe(true);
  });
});

describe("prompt access", () => {
  it("never grants prompts:read to CLIENT, CONTRACTOR, or SALES_ADVISOR", () => {
    for (const role of ["CLIENT", "CONTRACTOR", "SALES_ADVISOR"] as const) {
      expect(hasPermission(role, "prompts:read")).toBe(false);
    }
  });
});
