import "server-only";
import { db } from "../db";
import { writeAudit } from "../audit/log";
import { assertPermission, type Actor } from "../auth/permissions";
import { assertAdoptable } from "@/domain/framework/adoption";
import { DomainRuleError } from "@/domain/shared/errors";

/**
 * Records founder adoption of a framework version (DECISIONS C-02).
 * Attributed to the signed-in Admin who performs it; audit-logged with their statement.
 */
export async function recordFrameworkAdoption(actor: Actor, frameworkVersionId: string, statement: string) {
  assertPermission(actor, "framework:manage");
  return db.$transaction(async (tx) => {
    const fw = await tx.frameworkVersion.findUnique({ where: { id: frameworkVersionId } });
    if (!fw) throw new DomainRuleError("NOT_FOUND", "Framework version not found.");
    assertAdoptable(fw, statement);
    const adoptedAt = new Date();
    // Conditional write: a concurrent adoption cannot overwrite the first one.
    const { count } = await tx.frameworkVersion.updateMany({
      where: { id: fw.id, adoptedAt: null },
      data: { adoptedAt, adoptedById: actor.id },
    });
    if (count === 0) throw new DomainRuleError("FRAMEWORK_ALREADY_ADOPTED", "Adoption is already recorded for this framework version.");
    await writeAudit(
      {
        userId: actor.id,
        entityType: "FrameworkVersion",
        entityId: fw.id,
        action: "FRAMEWORK_CHANGE",
        before: { adoptedAt: null, adoptedById: null },
        after: { code: fw.code, adoptedAt, adoptedById: actor.id },
        reason: statement.trim(),
      },
      tx,
    );
  });
}
