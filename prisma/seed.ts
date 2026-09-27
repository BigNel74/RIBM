/**
 * Idempotent seed: framework versions, zones, sections, offers, and the
 * initial ADMIN (credentials from environment only — nothing committed).
 * Re-running never modifies an existing framework version's definitions.
 */
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  DIAGNOSTIC_SECTIONS,
  DIAGNOSTIC_ZONES,
  FRAMEWORK_VERSION,
  OFFERS,
  PROMPT_VERSION_PLACEHOLDER,
  REPORT_TEMPLATE_VERSION,
  SCORING_VERSION,
} from "../src/domain/framework/revenue-spine-framework";
import { SCORING_RULES_V1 } from "../src/domain/scoring/rules";

const db = new PrismaClient();

async function seedFramework() {
  const existing = await db.frameworkVersion.findUnique({ where: { code: FRAMEWORK_VERSION.code } });
  if (existing) {
    console.log(`Framework ${FRAMEWORK_VERSION.code} exists — definitions left untouched.`);
    return;
  }
  await db.frameworkVersion.create({
    data: {
      code: FRAMEWORK_VERSION.code,
      label: FRAMEWORK_VERSION.label,
      notes: FRAMEWORK_VERSION.notes,
      status: "ACTIVE",
      zones: { create: DIAGNOSTIC_ZONES.map((z, i) => ({ ...z, position: i + 1 })) },
      sections: {
        create: DIAGNOSTIC_SECTIONS.map((s) => ({ number: s.number, key: s.key, name: s.name, description: "" })),
      },
    },
  });
  console.log(`Framework ${FRAMEWORK_VERSION.code} created with 5 zones and 15 sections.`);
}

async function seedVersions() {
  await db.scoringVersion.upsert({
    where: { code: SCORING_VERSION.code },
    update: {},
    create: { ...SCORING_VERSION, status: "ACTIVE", rules: SCORING_RULES_V1 },
  });
  await db.reportTemplateVersion.upsert({
    where: { code: REPORT_TEMPLATE_VERSION.code },
    update: {},
    create: {
      code: REPORT_TEMPLATE_VERSION.code,
      label: REPORT_TEMPLATE_VERSION.label,
      status: "ACTIVE",
      sections: [...REPORT_TEMPLATE_VERSION.sections],
    },
  });
  await db.promptVersion.upsert({
    where: { code: PROMPT_VERSION_PLACEHOLDER.code },
    update: {},
    create: {
      ...PROMPT_VERSION_PLACEHOLDER,
      checksum: createHash("sha256").update(PROMPT_VERSION_PLACEHOLDER.promptText).digest("hex"),
      status: "DRAFT",
    },
  });
}

async function seedOffers() {
  for (const o of OFFERS) {
    // Create only: offer status is Admin-managed after first seed.
    await db.offer.upsert({
      where: { name: o.name },
      update: {},
      create: {
        name: o.name,
        status: o.status,
        aliases: o.aliases,
        description: o.description,
        confidence: {
          create: (["DEMAND", "WILLINGNESS_TO_PAY", "DELIVERY", "OUTCOME", "RECURRING_VALUE"] as const).map((dimension) => ({
            dimension,
            level: "LOW" as const,
            basis: "No validation evidence recorded yet.",
          })),
        },
      },
    });
  }
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin user.");
    return;
  }
  if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} exists — unchanged.`);
    return;
  }
  const user = await db.user.create({
    data: {
      email,
      name: process.env.SEED_ADMIN_NAME?.trim() || "RIBM Admin",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  await db.auditLog.create({
    data: { userId: null, entityType: "User", entityId: user.id, action: "CREATE", after: { email, role: "ADMIN" }, reason: "Initial seed" },
  });
  console.log(`Admin ${email} created.`);
}

async function main() {
  await seedFramework();
  await seedVersions();
  await seedOffers();
  await seedAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
