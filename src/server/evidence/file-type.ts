/**
 * Evidence upload allowlist, detected from file content (magic bytes), never
 * from the client-supplied name or MIME type. Pure — unit-tested.
 */
export const MAX_EVIDENCE_FILE_BYTES = 10 * 1024 * 1024;

export type AllowedEvidenceType = { mime: "image/png" | "image/jpeg" | "image/webp" | "application/pdf"; ext: string };

export function detectEvidenceFileType(bytes: Uint8Array): AllowedEvidenceType | null {
  const b = bytes;
  const at = (offset: number, sig: number[]) => sig.every((v, k) => b[offset + k] === v);
  const ascii = (offset: number, s: string) => at(offset, [...s].map((c) => c.charCodeAt(0)));

  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", ext: "png" };
  if (at(0, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return { mime: "image/webp", ext: "webp" };
  if (ascii(0, "%PDF-")) return { mime: "application/pdf", ext: "pdf" };
  return null;
}

/** Display-safe file name: no paths, control characters, or quotes; capped length. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.replace(/[\u0000-\u001f\u007f"<>|:*?]/g, "_").trim();
  return (cleaned || "file").slice(0, 120);
}
