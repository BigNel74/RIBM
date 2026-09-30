import "server-only";
import { assertEvidenceStateChange } from "@/domain/evidence/evidence-state";
import { DomainRuleError } from "@/domain/shared/errors";
import { writeAudit } from "../audit/log";
import { assertPermission, type Actor } from "../auth/permissions";
import { db } from "../db";
import { beginDiagnosticEdit } from "../diagnostics/editable";
import { detectEvidenceFileType, MAX_EVIDENCE_FILE_BYTES, sanitizeFileName } from "./file-type";
import { evidenceContentSchema, evidenceCreateSchema, evidenceStateChangeSchema } from "./schemas";
import { deleteEvidenceFile, readEvidenceFile, saveEvidenceFile } from "./storage";

export interface UploadedFile {
  name: string;
  bytes: Uint8Array;
}

/** Validates an upload by size and content (magic bytes). */
function inspectUpload(file: UploadedFile | null) {
  if (!file || file.bytes.byteLength === 0) return null;
  if (file.bytes.byteLength > MAX_EVIDENCE_FILE_BYTES) {
    throw new DomainRuleError("EVIDENCE_FILE_TOO_LARGE", "Files must be 10 MB or smaller.");
  }
  const type = detectEvidenceFileType(file.bytes);
  if (!type) throw new DomainRuleError("EVIDENCE_FILE_TYPE", "Only PNG, JPEG, WebP images and PDF files can be attached.");
  return { ...type, name: sanitizeFileName(file.name), size: file.bytes.byteLength };
}

/**
 * Captures evidence on a diagnostic. It starts NOT_VERIFIED unless the
 * operator records another state with its basis (E1, E2): VERIFIED also
 * needs a verification source — the URL or the attached file.
 */
export async function createEvidence(actor: Actor, diagnosticId: string, raw: unknown, file: UploadedFile | null) {
  assertPermission(actor, "evidence:write");
  const input = evidenceCreateSchema.parse(raw);
  const upload = inspectUpload(file);

  if (input.evidenceState !== "NOT_VERIFIED") {
    assertEvidenceStateChange({
      from: "NOT_VERIFIED",
      to: input.evidenceState,
      actorRole: actor.role,
      reason: input.stateReason,
      verificationSource: input.sourceUrl ?? (upload ? `file:${upload.name}` : null),
    });
  }

  // Write the file first; remove it if the transaction fails.
  const diagnosticClient = await db.diagnostic.findUnique({ where: { id: diagnosticId }, select: { clientId: true } });
  if (!diagnosticClient) throw new DomainRuleError("NOT_FOUND", "Diagnostic not found.");
  const fileRef = upload ? await saveEvidenceFile(diagnosticClient.clientId, upload.ext, file!.bytes) : null;

  try {
    return await db.$transaction(async (tx) => {
      const diagnostic = await beginDiagnosticEdit(tx, actor, diagnosticId);
      const { stateReason, ...content } = input;
      const item = await tx.evidenceItem.create({
        data: {
          ...content,
          clientId: diagnostic.clientId,
          diagnosticId,
          capturedById: actor.id,
          ...(upload ? { fileRef, fileName: upload.name, fileMimeType: upload.mime, fileSize: upload.size } : {}),
          ...(input.evidenceState !== "NOT_VERIFIED" ? { stateChangedAt: new Date(), stateChangeReason: stateReason } : {}),
        },
      });
      await writeAudit(
        {
          userId: actor.id,
          entityType: "EvidenceItem",
          entityId: item.id,
          action: "CREATE",
          after: { diagnosticId, type: item.type, source: item.source, evidenceState: item.evidenceState, fileName: item.fileName },
          reason: stateReason,
        },
        tx,
      );
      return item;
    });
  } catch (e) {
    if (fileRef) await deleteEvidenceFile(fileRef);
    throw e;
  }
}

export async function updateEvidenceContent(actor: Actor, evidenceId: string, raw: unknown) {
  assertPermission(actor, "evidence:write");
  const data = evidenceContentSchema.parse(raw);
  return db.$transaction(async (tx) => {
    const before = await tx.evidenceItem.findUnique({ where: { id: evidenceId } });
    if (!before || !before.diagnosticId) throw new DomainRuleError("NOT_FOUND", "Evidence not found.");
    await beginDiagnosticEdit(tx, actor, before.diagnosticId);
    const after = await tx.evidenceItem.update({ where: { id: evidenceId }, data });
    const beforeSubset = Object.fromEntries(Object.keys(data).map((k) => [k, before[k as keyof typeof before]]));
    await writeAudit({ userId: actor.id, entityType: "EvidenceItem", entityId: evidenceId, action: "UPDATE", before: beforeSubset, after: data }, tx);
    return after;
  });
}

/** Invariant E1: an explicit, attributable, reasoned state change. */
export async function changeEvidenceState(actor: Actor, evidenceId: string, raw: unknown) {
  assertPermission(actor, "evidence:verify");
  const input = evidenceStateChangeSchema.parse(raw);
  return db.$transaction(async (tx) => {
    const item = await tx.evidenceItem.findUnique({ where: { id: evidenceId } });
    if (!item || !item.diagnosticId) throw new DomainRuleError("NOT_FOUND", "Evidence not found.");
    assertEvidenceStateChange({
      from: item.evidenceState,
      to: input.to,
      actorRole: actor.role,
      reason: input.reason,
      verificationSource: input.verificationSource,
    });
    await beginDiagnosticEdit(tx, actor, item.diagnosticId);
    const updated = await tx.evidenceItem.update({
      where: { id: evidenceId },
      data: { evidenceState: input.to, stateChangedAt: new Date(), stateChangeReason: input.reason },
    });
    await writeAudit(
      {
        userId: actor.id,
        entityType: "EvidenceItem",
        entityId: evidenceId,
        action: "EVIDENCE_STATE_CHANGE",
        before: { evidenceState: item.evidenceState },
        after: { evidenceState: input.to, verificationSource: input.verificationSource },
        reason: input.reason,
      },
      tx,
    );
    return updated;
  });
}

/** Invariant E4: evidence referenced by a score, section, finding, fix, or claim cannot be deleted. */
export async function deleteEvidence(actor: Actor, evidenceId: string) {
  assertPermission(actor, "evidence:write");
  const fileRef = await db.$transaction(async (tx) => {
    const item = await tx.evidenceItem.findUnique({
      where: { id: evidenceId },
      include: { _count: { select: { zoneScores: true, sectionResults: true, findings: true, priorityFixes: true, claims: true } } },
    });
    if (!item || !item.diagnosticId) throw new DomainRuleError("NOT_FOUND", "Evidence not found.");
    const refs = Object.values(item._count).reduce((a, b) => a + b, 0);
    if (refs > 0) {
      throw new DomainRuleError(
        "EVIDENCE_REFERENCED",
        `This evidence supports ${refs} score, section, finding, or fix link(s). Unlink it first; referenced evidence cannot be deleted.`,
      );
    }
    await beginDiagnosticEdit(tx, actor, item.diagnosticId);
    await tx.evidenceItem.delete({ where: { id: evidenceId } });
    await writeAudit(
      {
        userId: actor.id,
        entityType: "EvidenceItem",
        entityId: evidenceId,
        action: "DELETE",
        before: { diagnosticId: item.diagnosticId, type: item.type, source: item.source, evidenceState: item.evidenceState, fileName: item.fileName },
        reason: "Unreferenced evidence removed",
      },
      tx,
    );
    return item.fileRef;
  });
  if (fileRef) await deleteEvidenceFile(fileRef);
}

/** For the authenticated file route. Internal roles only (evidence:read). */
export async function getEvidenceFile(actor: Actor, evidenceId: string) {
  assertPermission(actor, "evidence:read");
  const item = await db.evidenceItem.findUnique({
    where: { id: evidenceId },
    select: { fileRef: true, fileName: true, fileMimeType: true },
  });
  if (!item?.fileRef || !item.fileMimeType || !item.fileName) throw new DomainRuleError("NOT_FOUND", "File not found.");
  return { bytes: await readEvidenceFile(item.fileRef), mime: item.fileMimeType, name: item.fileName };
}
