import type { getDiagnostic } from "@/server/diagnostics/service";

export type DiagnosticView = Awaited<ReturnType<typeof getDiagnostic>>;

export interface TabProps {
  d: DiagnosticView;
  /** False when the user lacks write permission or the diagnostic is finalized. */
  editable: boolean;
  canVerify: boolean;
}

export const pickable = (d: DiagnosticView) =>
  d.evidence.map((e) => ({
    id: e.id,
    source: e.source,
    type: e.type,
    evidenceState: e.evidenceState,
    capturedText: e.capturedText,
    fileName: e.fileName,
  }));
