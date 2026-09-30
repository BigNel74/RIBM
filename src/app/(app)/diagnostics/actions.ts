"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Permission } from "@/server/auth/permissions";
import { requireActionPermission } from "@/server/auth/guards";
import type { Actor } from "@/server/auth/permissions";
import * as diagnostics from "@/server/diagnostics/service";
import * as evidence from "@/server/evidence/service";
import * as qa from "@/server/qa/service";
import * as reports from "@/server/reports/service";
import { failure, success, type ActionState } from "@/server/forms/action-state";
import { formToObject } from "@/server/forms/fields";

/** Shared shape: authorize, run, revalidate the diagnostic page, report state. */
async function run(permission: Permission, diagnosticId: string, fn: (actor: Actor) => Promise<unknown>): Promise<ActionState> {
  try {
    const actor = await requireActionPermission(permission);
    await fn(actor);
  } catch (e) {
    return failure(e);
  }
  revalidatePath(`/diagnostics/${diagnosticId}`);
  return success();
}

const EVIDENCE_IDS = ["evidenceIds"] as const;

export async function createDiagnosticAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let id: string;
  try {
    const actor = await requireActionPermission("diagnostics:write");
    id = (await diagnostics.createDiagnostic(actor, formToObject(formData))).id;
  } catch (e) {
    return failure(e);
  }
  redirect(`/diagnostics/${id}?tab=intake`);
}

export async function updateIntakeAction(id: string, _p: ActionState, fd: FormData) {
  return run("diagnostics:write", id, (a) => diagnostics.updateIntake(a, id, formToObject(fd)));
}
export async function updateNarrativeAction(id: string, _p: ActionState, fd: FormData) {
  return run("diagnostics:write", id, (a) => diagnostics.updateNarrative(a, id, formToObject(fd)));
}
export async function updateZoneAction(id: string, zoneScoreId: string, _p: ActionState, fd: FormData) {
  return run("diagnostics:write", id, (a) => diagnostics.updateZoneScore(a, zoneScoreId, formToObject(fd, EVIDENCE_IDS)));
}
export async function updateSectionAction(id: string, sectionId: string, _p: ActionState, fd: FormData) {
  return run("diagnostics:write", id, (a) => diagnostics.updateSection(a, sectionId, formToObject(fd, EVIDENCE_IDS)));
}
export async function createFindingAction(id: string, _p: ActionState, fd: FormData) {
  return run("diagnostics:write", id, (a) => diagnostics.createFinding(a, id, formToObject(fd, EVIDENCE_IDS)));
}
export async function updateFindingAction(id: string, findingId: string, _p: ActionState, fd: FormData) {
  return run("diagnostics:write", id, (a) => diagnostics.updateFinding(a, findingId, formToObject(fd, EVIDENCE_IDS)));
}
export async function deleteFindingAction(id: string, findingId: string) {
  return run("diagnostics:write", id, (a) => diagnostics.deleteFinding(a, findingId));
}
export async function createLeakAction(id: string, _p: ActionState, fd: FormData) {
  return run("diagnostics:write", id, (a) => diagnostics.createLeakScenario(a, id, formToObject(fd)));
}
export async function updateLeakAction(id: string, scenarioId: string, _p: ActionState, fd: FormData) {
  return run("diagnostics:write", id, (a) => diagnostics.updateLeakScenario(a, scenarioId, formToObject(fd)));
}
export async function deleteLeakAction(id: string, scenarioId: string) {
  return run("diagnostics:write", id, (a) => diagnostics.deleteLeakScenario(a, scenarioId));
}
export async function createFixAction(id: string, _p: ActionState, fd: FormData) {
  return run("diagnostics:write", id, (a) => diagnostics.createPriorityFix(a, id, formToObject(fd, EVIDENCE_IDS)));
}
export async function updateFixAction(id: string, fixId: string, _p: ActionState, fd: FormData) {
  return run("diagnostics:write", id, (a) => diagnostics.updatePriorityFix(a, fixId, formToObject(fd, EVIDENCE_IDS)));
}
export async function moveFixAction(id: string, fixId: string, direction: "up" | "down") {
  return run("diagnostics:write", id, (a) => diagnostics.movePriorityFix(a, fixId, direction));
}
export async function deleteFixAction(id: string, fixId: string) {
  return run("diagnostics:write", id, (a) => diagnostics.deletePriorityFix(a, fixId));
}

export async function createEvidenceAction(id: string, _p: ActionState, fd: FormData) {
  const file = fd.get("file");
  const upload = file instanceof File && file.size > 0 ? { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) } : null;
  return run("evidence:write", id, (a) => evidence.createEvidence(a, id, formToObject(fd), upload));
}
export async function updateEvidenceAction(id: string, evidenceId: string, _p: ActionState, fd: FormData) {
  return run("evidence:write", id, (a) => evidence.updateEvidenceContent(a, evidenceId, formToObject(fd)));
}
export async function changeEvidenceStateAction(id: string, evidenceId: string, _p: ActionState, fd: FormData) {
  return run("evidence:verify", id, (a) => evidence.changeEvidenceState(a, evidenceId, formToObject(fd)));
}
export async function deleteEvidenceAction(id: string, evidenceId: string) {
  return run("evidence:write", id, (a) => evidence.deleteEvidence(a, evidenceId));
}

// ───────────── QA, finalization, publishing (Phase 4) ─────────────

export async function runQaAction(id: string, _p: ActionState, fd: FormData) {
  return run("qa:run", id, (a) => qa.runQa(a, id, formToObject(fd)));
}
export async function finalizeAction(id: string) {
  return run("diagnostics:finalize", id, (a) => qa.finalizeDiagnostic(a, id));
}
export async function publishReportAction(id: string) {
  const state = await run("reports:publish", id, (a) => reports.publishReport(a, id));
  revalidatePath("/reports");
  return state;
}
export async function withdrawReportAction(id: string, reportId: string, _p: ActionState, fd: FormData) {
  const reason = fd.get("reason");
  const state = await run("reports:publish", id, (a) => reports.withdrawReport(a, reportId, typeof reason === "string" ? reason : ""));
  revalidatePath("/reports");
  return state;
}
