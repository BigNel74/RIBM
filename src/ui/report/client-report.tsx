import type { ReactNode } from "react";
import type { ReportSnapshotV1 } from "@/domain/reports/snapshot";
import type { EvidenceState } from "@/domain/shared/enums";

/**
 * Client report renderer. Renders ONLY from the frozen snapshot, in the
 * template's section order. Light, mobile-first, print-friendly (see
 * `.report` rules in globals.css).
 */

const STATE_CLASS: Record<EvidenceState, string> = {
  VERIFIED: "rp-chip rp-chip--verified",
  CLIENT_PROVIDED: "rp-chip rp-chip--client",
  ASSUMPTION: "rp-chip rp-chip--assumption",
  NOT_VERIFIED: "rp-chip rp-chip--unverified",
};
const STATE_SHORT: Record<EvidenceState, string> = {
  VERIFIED: "Verified",
  CLIENT_PROVIDED: "Client-provided",
  ASSUMPTION: "Assumption",
  NOT_VERIFIED: "Not verified",
};

function State({ state, title }: { state: EvidenceState; title?: string }) {
  return (
    <span className={STATE_CLASS[state]} title={title}>
      {STATE_SHORT[state]}
    </span>
  );
}

const usd = (n: number | null) =>
  n === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="rp-section" aria-labelledby={`rp-${n}`}>
      <h2 id={`rp-${n}`}>
        <span className="rp-num">{String(n).padStart(2, "0")}</span> {title}
      </h2>
      {children}
    </section>
  );
}

function Prose({ text }: { text: string | null }) {
  return text ? <p className="rp-prose">{text}</p> : <p className="rp-muted">Not provided.</p>;
}

function Refs({ refs }: { refs: string[] }) {
  return refs.length ? <span className="rp-refs">Evidence {refs.join(", ")}</span> : null;
}

export function ClientReport({ s }: { s: ReportSnapshotV1 }) {
  const render: Record<string, (n: number) => ReactNode> = {
    COVER: () => (
      <header className="rp-cover" key="cover">
        <p className="rp-eyebrow">{s.preparedBy} · Revenue Spine Diagnostic</p>
        <h1>{s.clientName}</h1>
        <p className="rp-sub">{s.title}</p>
        <p className="rp-meta">
          Prepared {s.preparedAt.slice(0, 10)} · Framework {s.versions.framework} · Scoring {s.versions.scoring}
        </p>
        <p className="rp-legend">
          Every claim carries its evidence state: <State state="VERIFIED" /> observed directly · <State state="CLIENT_PROVIDED" /> stated by you ·{" "}
          <State state="ASSUMPTION" /> used only for scenarios · <State state="NOT_VERIFIED" /> not verified from available evidence.
        </p>
      </header>
    ),
    EXECUTIVE_DIAGNOSIS: (n) => (
      <Section n={n} title="Executive diagnosis" key="exec">
        <Prose text={s.narrative.executiveDiagnosis} />
      </Section>
    ),
    REVENUE_SPINE_STRENGTH: (n) => (
      <Section n={n} title="Revenue Spine strength" key="strength">
        <Prose text={s.narrative.revenueSpineStrength} />
        <p className="rp-muted">Zone scores (next section) are a consistency instrument for comparing zones, not a scientific measurement. No composite score is calculated.</p>
      </Section>
    ),
    FIVE_ZONE_SCORECARD: (n) => (
      <Section n={n} title="Five-zone scorecard" key="zones">
        <div className="rp-zones">
          {s.zones.map((z) => (
            <div className="rp-zone" key={z.name}>
              <div className="rp-zone-head">
                <h3>{z.name}</h3>
                <span className="rp-score">{z.score ?? "—"}<small>/10</small></span>
              </div>
              <div className="rp-bar" aria-hidden>
                <span style={{ width: `${(z.score ?? 0) * 10}%` }} />
              </div>
              {z.diagnosis ? <p>{z.diagnosis}</p> : null}
              {z.primaryWeakness ? (
                <p>
                  <strong>Primary weakness:</strong> {z.primaryWeakness}
                </p>
              ) : null}
              <p className="rp-muted">
                Confidence {z.confidence.toLowerCase()} <Refs refs={z.evidenceRefs} />
              </p>
            </div>
          ))}
        </div>
      </Section>
    ),
    BIGGEST_CONSTRAINT: (n) => (
      <Section n={n} title="Biggest constraint" key="constraint">
        <Prose text={s.narrative.biggestConstraint} />
      </Section>
    ),
    EVIDENCE: (n) => (
      <Section n={n} title="Evidence" key="evidence">
        {s.findings.length ? (
          <>
            <h3>What we found</h3>
            <ul className="rp-findings">
              {s.findings.map((f, i) => (
                <li key={i}>
                  <State state={f.state} title={f.stateLabel} /> {f.statement} <Refs refs={f.evidenceRefs} />
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <h3>Evidence record</h3>
        {s.evidence.length ? (
          <ol className="rp-evidence">
            {s.evidence.map((e) => (
              <li key={e.ref}>
                <span className="rp-ref">{e.ref}</span>
                <div>
                  <p>
                    <strong>{e.source}</strong> <State state={e.state} title={e.stateLabel} />
                  </p>
                  {e.capturedText ? <p className="rp-quote">{e.capturedText}</p> : null}
                  {e.sourceUrl ? <p className="rp-muted rp-url">{e.sourceUrl}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rp-muted">No evidence items are referenced.</p>
        )}
      </Section>
    ),
    PRIORITY_PROBLEMS: (n) => (
      <Section n={n} title="Priority problems" key="problems">
        <ol className="rp-list">
          {s.fixes.map((f) => (
            <li key={f.rank}>
              {f.problem} <Refs refs={f.evidenceRefs} />
            </li>
          ))}
        </ol>
      </Section>
    ),
    PRIORITY_FIXES: (n) => (
      <Section n={n} title="Priority fixes" key="fixes">
        <ol className="rp-list">
          {s.fixes.map((f) => (
            <li key={f.rank}>
              <strong>{f.fix}</strong>
              {f.interventionClass || f.effort ? <span className="rp-muted"> — {[f.interventionClass, f.effort].filter(Boolean).join(" · ")}</span> : null}
            </li>
          ))}
        </ol>
      </Section>
    ),
    RECOMMENDED_INTERVENTION_DIRECTION: (n) => (
      <Section n={n} title="Recommended intervention direction" key="direction">
        <Prose text={s.narrative.recommendedInterventionDirection} />
        {s.narrative.finalRecommendation ? (
          <div className="rp-callout">
            <p className="rp-eyebrow">Recommendation</p>
            <p>{s.narrative.finalRecommendation}</p>
          </div>
        ) : null}
      </Section>
    ),
    REVENUE_EXPOSURE_SCENARIO: (n) =>
      s.scenarios.length ? (
        <Section n={n} title="Revenue exposure scenario" key="exposure">
          <p className="rp-muted">
            Average client value × missed bookings per week × weeks per month = {s.exposureLabel.toLowerCase()}. This is a decision aid, not a claim that money was lost.
          </p>
          {s.scenarios.map((sc, i) => (
            <div className="rp-scenario" key={i}>
              <h3>{sc.label}</h3>
              <table>
                <tbody>
                  <tr>
                    <th scope="row">Average client value</th>
                    <td>{usd(sc.averageClientValue)}</td>
                    <td><State state={sc.averageClientValueState} /></td>
                  </tr>
                  <tr>
                    <th scope="row">Missed bookings per week</th>
                    <td>{sc.missedBookingsPerWeek ?? "—"}</td>
                    <td><State state={sc.missedBookingsState} /></td>
                  </tr>
                  <tr>
                    <th scope="row">Weeks per month</th>
                    <td>{sc.weeksPerMonth}</td>
                    <td><State state={sc.weeksPerMonthState} /></td>
                  </tr>
                  <tr className="rp-total">
                    <th scope="row">{s.exposureLabel} / month</th>
                    <td>{sc.estimatedMonthlyExposure === null ? "—" : usd(sc.estimatedMonthlyExposure)}</td>
                    <td><State state={sc.estimatedMonthlyExposure === null ? "NOT_VERIFIED" : sc.resultState} title={sc.resultLabel} /></td>
                  </tr>
                </tbody>
              </table>
              <p className="rp-muted">{sc.resultLabel}</p>
            </div>
          ))}
        </Section>
      ) : null,
    IMPLEMENTATION_READINESS: (n) => (
      <Section n={n} title="Implementation readiness" key="readiness">
        <Prose text={s.narrative.implementationReadiness} />
      </Section>
    ),
    MEASUREMENT_PLAN: (n) => (
      <Section n={n} title="Measurement plan" key="measurement">
        <Prose text={s.narrative.measurementPlan} />
      </Section>
    ),
    NEXT_DECISION: (n) => (
      <Section n={n} title="Next decision" key="next">
        <div className="rp-callout rp-callout--action">
          <p>{s.narrative.nextDecision ?? "Not provided."}</p>
        </div>
      </Section>
    ),
  };

  // Number the sections that actually render, in template order (the cover is unnumbered).
  const visible = s.sections.filter((key) => render[key] && !(key === "REVENUE_EXPOSURE_SCENARIO" && !s.scenarios.length));
  const body = visible.map((key) => render[key](key === "COVER" ? 0 : visible.filter((k) => k !== "COVER").indexOf(key) + 1));

  return (
    <article className="report">
      {body}
      <footer className="rp-footer">
        <p>
          {s.preparedBy} · Report template {s.versions.reportTemplate} · Framework {s.versions.framework} · Scoring {s.versions.scoring}
        </p>
      </footer>
    </article>
  );
}
