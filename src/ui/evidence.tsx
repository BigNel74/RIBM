import type { EvidenceState } from "@/domain/shared/enums";
import { EVIDENCE_STATE_LABELS } from "@/domain/shared/enums";
import { StatusChip } from "./primitives";

const TONE: Record<EvidenceState, "verified" | "gold" | "neutral" | "critical"> = {
  VERIFIED: "verified",
  CLIENT_PROVIDED: "gold",
  ASSUMPTION: "neutral",
  NOT_VERIFIED: "critical",
};

const SHORT: Record<EvidenceState, string> = {
  VERIFIED: "Verified",
  CLIENT_PROVIDED: "Client-provided",
  ASSUMPTION: "Assumption",
  NOT_VERIFIED: "Not verified",
};

export function EvidenceStateChip({ state }: { state: EvidenceState }) {
  return (
    <span title={EVIDENCE_STATE_LABELS[state]}>
      <StatusChip tone={TONE[state]}>{SHORT[state]}</StatusChip>
    </span>
  );
}

export const EVIDENCE_STATE_OPTIONS = (Object.keys(SHORT) as EvidenceState[]).map((value) => ({
  value,
  label: value === "NOT_VERIFIED" ? "Not verified from available evidence" : SHORT[value],
}));

export interface PickableEvidence {
  id: string;
  source: string;
  type: string;
  evidenceState: EvidenceState;
  capturedText: string | null;
  fileName: string | null;
}

/** Checkbox group for linking evidence. Rendered inside an ActionForm; submits `evidenceIds`. */
export function EvidencePicker({ evidence, selected, legend = "Linked evidence" }: { evidence: PickableEvidence[]; selected: string[]; legend?: string }) {
  if (evidence.length === 0) {
    return <p className="text-xs text-bone-400">No evidence captured yet. Add evidence in the Evidence tab to link it here.</p>;
  }
  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-bone-300">{legend}</legend>
      <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-ink-700 p-2">
        {evidence.map((e) => (
          <label key={e.id} className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 text-sm hover:bg-ink-850">
            <input type="checkbox" name="evidenceIds" value={e.id} defaultChecked={selected.includes(e.id)} className="mt-1 size-4 accent-[var(--color-signal-gold)]" />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <EvidenceStateChip state={e.evidenceState} />
                <span className="font-medium">{e.source}</span>
                {e.fileName ? <span className="font-mono text-xs text-bone-400">{e.fileName}</span> : null}
              </span>
              {e.capturedText ? <span className="line-clamp-2 block text-xs text-bone-400">{e.capturedText}</span> : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export const money = (n: number | string | null | { toString(): string }) =>
  n === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(n.toString()));
