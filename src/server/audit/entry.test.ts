import { describe, expect, it } from "vitest";
import { AUDIT_ACTIONS, buildAuditEntry } from "./entry";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("buildAuditEntry", () => {
  it("records before/after for a score change with a reason", () => {
    const e = buildAuditEntry({
      userId: "u1",
      entityType: "ZoneScore",
      entityId: "zs1",
      action: "SCORE_CHANGE",
      before: { score: 5 },
      after: { score: 7 },
      reason: "Verified booking confirmation flow",
    });
    expect(e).toEqual({
      userId: "u1",
      entityType: "ZoneScore",
      entityId: "zs1",
      action: "SCORE_CHANGE",
      before: { score: 5 },
      after: { score: 7 },
      reason: "Verified booking confirmation flow",
    });
  });

  it.each(["SCORE_CHANGE", "EVIDENCE_STATE_CHANGE", "PERMISSION_CHANGE", "FRAMEWORK_CHANGE"] as const)(
    "requires a reason for %s",
    (action) => {
      expect(() => buildAuditEntry({ userId: "u1", entityType: "X", entityId: "1", action, reason: " " })).toThrow(/requires a reason/);
    },
  );

  it("redacts secrets and prompt text at any depth", () => {
    const e = buildAuditEntry({
      userId: "u1",
      entityType: "User",
      entityId: "u2",
      action: "UPDATE",
      after: { email: "a@b.c", passwordHash: "$2b$...", nested: { promptText: "secret", tokenHash: "abc" } },
    });
    expect(e.after).toEqual({ email: "a@b.c", passwordHash: "[REDACTED]", nested: { promptText: "[REDACTED]", tokenHash: "[REDACTED]" } });
  });

  it("serializes dates", () => {
    const e = buildAuditEntry({ userId: null, entityType: "X", entityId: "1", action: "CREATE", after: { at: new Date(Date.UTC(2026, 8, 27)) } });
    expect(e.after).toEqual({ at: "2026-09-27T00:00:00.000Z" });
  });

  it("covers exactly the AuditAction enum in the schema", () => {
    const schema = readFileSync(join(__dirname, "../../../prisma/schema.prisma"), "utf8");
    const values = schema.match(/enum AuditAction \{([^}]*)\}/)![1].split("\n").map((l) => l.trim()).filter(Boolean);
    expect(values).toEqual([...AUDIT_ACTIONS]);
  });
});
