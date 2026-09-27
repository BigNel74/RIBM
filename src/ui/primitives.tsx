import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-700 pb-5">
      <div>
        {eyebrow ? <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal-gold">{eyebrow}</p> : null}
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-bone-400">{description}</p> : null}
      </div>
      {actions}
    </header>
  );
}

type Tone = "neutral" | "critical" | "gold" | "verified";

const TONES: Record<Tone, string> = {
  neutral: "border-ink-700 text-bone-300",
  critical: "border-signal-red/50 text-signal-red",
  gold: "border-signal-gold/50 text-signal-gold",
  verified: "border-signal-green/50 text-signal-green",
};

export function StatusChip({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-ink-700 bg-ink-900">
      {title ? <h2 className="border-b border-ink-700 px-4 py-3 text-sm font-semibold">{title}</h2> : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function DataTable({ columns, rows, empty }: { columns: string[]; rows: ReactNode[][]; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-bone-400">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ink-700 text-xs uppercase tracking-wider text-bone-400">
            {columns.map((c) => (
              <th key={c} scope="col" className="px-3 py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-ink-700/60 last:border-0">
              {r.map((cell, j) => (
                <td key={j} className="px-3 py-2.5 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Honest placeholder for a module scheduled in a later phase. */
export function ModulePending({ phase, purpose, next }: { phase: string; purpose: string; next: string[] }) {
  return (
    <Panel>
      <div className="flex items-center gap-2">
        <StatusChip tone="gold">{phase}</StatusChip>
        <span className="text-sm text-bone-300">Not built yet</span>
      </div>
      <p className="mt-3 max-w-2xl text-sm text-bone-300">{purpose}</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-bone-400">
        {next.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </Panel>
  );
}
