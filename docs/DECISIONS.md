# RIBM Revenue Spine App OS — Decisions Log

Architecture decisions (ADR) and source-document conflicts. Nothing here is silently reconciled: each entry names the conflict, the source that wins, and why.

Source priority (from the build directive):

1. `04_RIBM_Revenue_Spine_App_OS_Master_System_Prompt_v2_1_VALIDATED` (**04**)
2. `01_RUN_It_BAC_Media_Business_OS_v4_1_VALIDATED` (**01**)
3. `03_Revenue_Spine_Philosophy_v1_1_VALIDATED` (**03**)
4. `02_RUN_It_BAC_Media_Business_and_Marketing_Plan_v2_1_VALIDATED` (**02**)
5. `00_95pct_Confidence_Validation_Memo` (**00**)

The build directive itself (the MVP 1 prompt that started this work, **BD**) scopes MVP 1. Where BD is narrower than 04, BD governs *scope for MVP 1*; 04 governs *rules*.

Status values: `ACCEPTED` (in force), `PROPOSED` (needs founder confirmation — implemented as a configurable default), `OPEN` (not yet decided).

---

## Part A — Architecture decisions

### ADR-001 · Dedicated repository `BigNel74/RIBM` — ACCEPTED (founder-directed, 2026-09-27)

- **History.** Session 1 was started in `BigNel74/lexirise-clickable`, a Lovable-generated LexiRise prototype whose `main` syncs into the Lovable editor. To avoid touching LexiRise, the app was built in an isolated `ribm-os/` folder on branch `claude/ribm-revenue-spine-app-os-kdlv0m`.
- **Decision.** On 2026-09-27 the founder directed the move to `https://github.com/BigNel74/RIBM`. The app now lives at the repository root, with planning docs in `/docs`. The branch in `lexirise-clickable` is superseded and must not be merged into its `main`.
- **Consequence.** One repository, one product. Standard layout: no subdirectory or workspace-root workarounds.

### ADR-002 · Do not reuse the LexiRise stack — ACCEPTED

- The existing stack is a client-only SPA (Vite, React 18, react-router, shadcn/ui). It has no server, no database, and no auth.
- BD §20 requires server-side permission enforcement, tenant isolation, and audit logs. A client-only SPA cannot enforce these. That is a blocking reason under BD §21, so the default stack is used.
- Nothing from the LexiRise code is reusable for RIBM except general patterns (Tailwind, Zod). The LexiRise design system (teal/coral, "no red anywhere") directly contradicts the RIBM visual system (red = critical), so it is not reused.

### ADR-003 · Stack: Next.js 16 (App Router) + TypeScript + Tailwind 4 + PostgreSQL 16 + Prisma 6 + Zod 4 + Vitest — ACCEPTED

- Next.js `16.3.6` (current stable at build time). React 19.
- **Prisma pinned to `6.19.3`**, not 7.x/8.x. npm's `latest` tag for `prisma` pointed at `8.0.0-rc.17` (a release candidate) on 2026-09-27, and 7.x moved to required driver adapters and `prisma.config.ts`. 6.19 is the mature line. Upgrade is a planned, isolated task, not a Phase 0 concern.
- **TypeScript pinned to 5.9.** The `latest` tag was 7.0 (the native compiler). Next 16 requires ≥5.1; 5.9 is the lowest-risk choice.
- Modular monolith. No microservices, no queues, no Redis.

### ADR-004 · Authentication: first-party database sessions, not Auth.js — ACCEPTED

- BD §21 allows "Auth.js or an equivalently maintainable authentication layer."
- Auth.js v5 was still published as `5.0.0-beta.32`. v4 targets older Next.js versions. Pinning the product's security boundary to a long-running beta adds risk.
- MVP 1 needs one thing: email + password login for a handful of internal users and invited clients. No OAuth.
- **Implementation.** `bcryptjs` password hashes (cost 12). 32-byte random session tokens. Only the SHA-256 hash of the token is stored (`Session.tokenHash`). The cookie is httpOnly, `SameSite=Lax`, `Secure` in production, and expires after 12 hours. Logout deletes the row. All of this is under ~150 lines in `src/server/auth/`, and it is covered by tests.
- **Revisit** if OAuth/SSO or magic links are needed. Auth.js can replace the session module without touching domain code.

### ADR-005 · Authorization is server-side and permission-based — ACCEPTED

- Roles map to named permissions in one matrix: `src/server/auth/permissions.ts`.
- Every server action and data-access function calls `requirePermission()` and, for client-scoped data, `assertClientAccess()`. Hiding UI is never the control.
- A CLIENT user is bound to exactly one `clientId` (`User.clientId`). Every client-scoped query adds that filter. If a CLIENT user has no `clientId`, access is denied.
- `PromptVersion.promptText` is never selected in any code path a CLIENT can reach. The report projection explicitly whitelists fields.

### ADR-006 · "Diagnostic" is the entity name, not "Audit" — ACCEPTED

- 04 §16 names the entity `Audit`. BD uses "15-Point Revenue Spine Audit" and `audit_id`, and also requires an `AuditLog`.
- To stop "audit" meaning two different things in code, the diagnostic engagement is `Diagnostic` and the change log is `AuditLog`. `EvidenceItem.diagnosticId` corresponds to BD's `audit_id`. UI copy can still say "Revenue Spine Audit."

### ADR-007 · Framework definitions are versioned reference rows, not enums — ACCEPTED

- The five zones and 15 sections are seeded as `DiagnosticZoneDefinition` / `DiagnosticSectionDefinition` rows, each attached to a `FrameworkVersion`.
- A future framework version can rename or reorder sections without breaking finalized diagnostics, because they keep pointing at the old version's rows (04 §17, 03 §12 "Do not overwrite old framework versions").
- Evidence states, QA states, stages, and similar values are Postgres enums, because they are workflow semantics, not methodology content.

### ADR-008 · Money as `Decimal(12,2)`, rates as `Decimal(6,4)` — ACCEPTED

No floats for money. Domain functions receive plain numbers, validated by Zod. The persistence layer converts at the edge.

### ADR-009 · Published reports are frozen snapshots — ACCEPTED

- A published `ClientReport` stores a JSON snapshot of the structured diagnostic, plus every version ID, at publish time.
- Later edits to the diagnostic do not change a published report. Republishing creates a new report row. This satisfies "never silently overwrite historical outputs" (BD §16).

### ADR-010 · AI behind an adapter; none wired in MVP 1 foundation — ACCEPTED

- `src/server/ai/` will define a `DiagnosticGenerator` port. Domain code never imports a vendor SDK.
- Phase 0–1 ships **no** model integration. Generated output will populate structured draft fields that an operator edits. It will never flow directly to a client.

### ADR-011 · Fonts self-hosted through `@fontsource` (IBM Plex Sans / Plex Mono) — ACCEPTED

- The build stays hermetic, with no Google Fonts fetch at build time.
- Plex was chosen for high legibility in dense tables and tabular numerals, and it avoids the generic Inter/Roboto look.

### ADR-012 · No Next.js `proxy` (middleware) for auth in MVP 1 — ACCEPTED

The authenticated layout, every page, and every server action verify the session themselves against the database. A proxy-only cookie check is optimistic and not a security boundary. It can be added later as a redirect optimization.

### ADR-013 · No generation buttons until a real adapter exists — ACCEPTED (Phase 3)

- `src/server/ai/port.ts` defines the `DiagnosticGenerator` port. `getDiagnosticGenerator()` returns `null` in MVP 1.
- The UI does **not** show "Analyze Evidence" or similar controls while no generator exists. A button that does nothing misleads the operator.
- When an adapter lands, every draft it produces arrives `NOT_VERIFIED` in editable structured fields, and the diagnostic pins a `PromptVersion`.

### ADR-014 · Exactly one ACTIVE version of each methodology kind — ACCEPTED (Phase 3)

- Opening a diagnostic fails if there are zero or several ACTIVE framework, scoring, or report-template versions. It never guesses by "newest."
- Found in testing: a stray ACTIVE test framework was silently picked up by a new diagnostic.

### ADR-015 · Evidence files: private local storage, content-sniffed, authenticated route — ACCEPTED (Phase 3)

- **Storage.** Files are stored under `STORAGE_DIR` (default `./storage`, gitignored), never under `public/`. Storage keys are generated server-side, and every resolved path is checked to stay inside the storage root.
- **Allowed types.** PNG, JPEG, WebP, and PDF only. The type is detected from the file's first bytes, never from its name or declared MIME type. SVG and HTML are rejected. The size cap is 10 MB, enforced in the service and by a database CHECK.
- **Serving.** Files are served only by `GET /api/evidence/[id]/file` to internal roles. It returns 404 for both "missing" and "forbidden." Responses carry `no-store`, `nosniff`, and a restrictive CSP. PDFs download; images render inline.
- **Hosting.** Local disk assumes a single server with a persistent volume. Before deployment (R9), decide between a persistent volume and object storage with signed URLs. The storage module is the only file that changes.

### ADR-016 · Forms submit via `onSubmit` + `startTransition`, not the `action` prop — ACCEPTED (Phase 3)

- React 19 resets a form after its `action` finishes, including after a validation error. That discarded operator input on every mistake.
- Found in testing (Phase 3). Fixed once in `ActionForm` and in the login form. The login form keeps the email and clears only the password.

---

## Part B — Source-document conflicts

### C-01 · Version labels disagree with filenames — ACCEPTED (use filenames)

- Filenames say v2.1 / v4.1 / v1.1 / v2.1 "VALIDATED". The title pages say "Master Build Prompt v2.0", "Version 4.0", "Version 1.0", "Version 2.0". The memo says "Revenue Spine v2.1."
- **Decision.** Treat the filename versions as the validated revisions. The seeded `FrameworkVersion` is `RS-FW-2.1`, with a note citing the inconsistency. No behavior depends on this.

### C-02 · "Governs only after the founder formally adopts Version 2.0" — ACCEPTED (founder adopted, 2026-09-27)

- Every document carries this versioning rule. There was no adoption record.
- **Resolution.** On 2026-09-27 the founder formally adopted this version (`RS-FW-2.1`, the validated source set 00–04).
- **Database record.** The founder chose option (a): an Admin-only **Record adoption** form in Settings. The signed-in Admin writes an adoption statement, and the record is attributed to that account and audit-logged (`FRAMEWORK_CHANGE`, statement as reason). It can be recorded only once, and never automatically. It remains null until the founder submits it.

### C-03 · Primary ICP: "established service organizations" vs "high-value local/professional service" — ACCEPTED (01 + 04)

- 02 §2 names *established service organizations* as the primary ICP and owner-operated local service as secondary.
- 01 §13, 04 §28, and 02 §14 (the later "Market-Validated Startup Revision") make **local/professional service conversion infrastructure** the 90-day wedge.
- **Decision.** 01 and 04 outrank 02, and 02's own revision agrees with them. The wedge is the PRIMARY offer. 02 §2 is treated as superseded for the first 90 days.
- **Founder approval.** Approved 2026-09-27.

### C-04 · Name of the primary offer — ACCEPTED (BD naming, aliases stored)

- BD: "Revenue Spine Conversion Infrastructure." 04 §28: "Local/Professional Service Conversion Infrastructure." 02 §14: "Revenue Spine Install" is PRIMARY. 01 §3: "Revenue Spine Install" is the primary cash engine.
- **Decision.** A single `Offer` row named **Revenue Spine Conversion Infrastructure** (status PRIMARY), with `aliases` = ["Revenue Spine Install — Local/Professional Service Edition", "Local/Professional Service Conversion Infrastructure"]. These are one offer, not three.

### C-05 · Offer statuses for secondary offers — ACCEPTED (BD, consistent with 02 §14)

| Offer | Status | Source |
|---|---|---|
| Revenue Spine Conversion Infrastructure | PRIMARY | BD, 04 §28, 02 §14 |
| Revenue Spine Optimization | POST_SALE | BD, 02 §14 |
| Revenue Spine Diagnostic (standalone) | TEST | BD, 02 §14 ("test after initial proof") |
| Revenue Spine Sprint | DEFERRED | Not listed in 02 §14's startup offers; 01 §3 lists it. Deferred, so it doesn't compete with the wedge |
| Revenue Spine Institutional | DEFERRED | BD, 02 §14 |
| Broader AI Operations | DEFERRED | BD, 02 §14 |
| External licensing / SaaS | DEFERRED | BD, 01 §13 sequential-expansion rule |
| Revenue Spine Snapshot (free qualification call) | TEST | 02 §14. It is an entry mechanism, not a paid offer. Stored so conversations can be attributed |

### C-06 · Opportunity stages differ across sources — ACCEPTED (BD for MVP 1)

- 01 §6 has 12 stages that run through Payment / Install / Outcome / Optimization. 04 §11 has a sales state machine. BD lists an 11-stage MVP set.
- **Decision.** MVP 1 uses BD's stages: TARGET, CONTACTED, CONVERSATION, QUALIFIED, DIAGNOSTIC, PRESCRIPTION_PENDING, PROPOSAL, WON, LOST, DEFERRED, DISQUALIFIED.
- The post-sale stages belong to the MVP 2/3 Deal and Install entities, not to Opportunity. That keeps Opportunity from turning into a project tracker.

### C-07 · Report sequence items 9 and 11 — ACCEPTED (BD for MVP 1)

- 04 §22 lists "Recommended Intervention / Prescription" and "Implementation Plan." BD lists "Recommended Intervention Direction" and "Implementation Readiness."
- **Decision.** The Prescription engine is MVP 2, so MVP 1 reports use BD's wording. The report template is versioned (`ReportTemplateVersion`), so MVP 2 moves to 04's sequence without altering MVP 1 reports.

### C-08 · QA gate "Prescription evidence mapping present" — ACCEPTED (deferred)

This check is in 04 §21, but prescriptions are MVP 2. MVP 1 QA implements BD §13's checklist. The check is added when the Prescription entity exists, and that addition bumps the framework version.

### C-09 · Decision-priority order — ACCEPTED (BD)

- 04 §26: Accuracy › Evidence › Commercial usefulness › Operator speed › Founder time › Client clarity › **Security & reproducibility** › Maintainability › Polish › Novelty.
- BD §28 puts **Security third**.
- **Decision.** Follow BD. It is the stricter ordering, and it is the directive for this build. Security trade-offs are never made for operator speed.

### C-10 · Evidence state naming — ACCEPTED

- 04 writes `CLIENT-PROVIDED` and describes an "UNKNOWN RULE" whose display text is *"Not verified from available evidence."* BD uses `CLIENT_PROVIDED` and a fourth state, `NOT_VERIFIED`.
- **Decision.** The enums are `VERIFIED | CLIENT_PROVIDED | ASSUMPTION | NOT_VERIFIED`. `NOT_VERIFIED` always renders as 04's exact phrase.

### C-11 · Validation thresholds: gates (01) vs confidence table (04) vs "VALIDATED" rule (00) — ACCEPTED (all three, layered)

- 01 §13 has validation **gates**, e.g. Demand = ≥5 qualified conversations in 30 days and ≥2 advancing; WTP = ≥2 paid engagements.
- 04 §28 has **confidence levels** per dimension, e.g. WTP HIGH = 3+ paid engagements.
- 00 says an offer is **VALIDATED** only with HIGH on Demand, WTP, Delivery, and Outcome, plus positive unit economics.
- These measure different things and do not contradict each other.
- **Decision.**
  - Confidence levels use 04's table exactly.
  - Gates use 01's thresholds and are reported per test as pass/fail.
  - `Offer.validationState` becomes `VALIDATED` only under 00's rule. Otherwise it is `TESTING`.
  - A passed WTP gate (2 paid) therefore does **not** make an offer VALIDATED (that needs 3+). This is intentional: the stricter rule protects against premature scaling.

### C-12 · "Sufficient history" for funnel math is undefined — ACCEPTED (founder confirmed, 2026-09-27)

- 01 §5 and 04 §5 require rates to be "trailing" and forbid false precision. No source defines how much history is enough.
- **Rule.** A stage rate is usable once its denominator is ≥ **5** (e.g. ≥5 decided proposals for close rate, ≥5 qualified conversations for conversation→proposal rate). Below that, the dashboard shows `INSUFFICIENT DATA` and accepts operator-entered scenario rates, which are labeled ASSUMPTION.
- The threshold is stored in `ScoringVersion.rules` (`funnelRateMinSample`), not hard-coded. Changing it requires a new ScoringVersion.
- **Founder confirmation.** Confirmed 2026-09-27.

### C-13 · Score thresholds "strong observable evidence" / "exceptional execution" are not operationalized — ACCEPTED (founder confirmed, 2026-09-27)

- 04 §8 and BD §11 say 7+ needs strong observable evidence and 9–10 needs exceptional execution. Neither is defined as a countable rule.
- **Rule (ScoringVersion `RS-SC-1.0`).**
  - Score ≥7 requires at least one linked evidence item in state **VERIFIED**. CLIENT_PROVIDED alone is not "observable."
  - Score ≥9 requires at least two VERIFIED items plus a written justification.
  - ASSUMPTION or NOT_VERIFIED evidence never supports a score above 6.
- Stored in `ScoringVersion.rules` so it can change without code edits.
- **Founder confirmation.** Confirmed 2026-09-27.

### C-14 · "Visual polish cannot compensate for broken commercial infrastructure" is not mechanizable — ACCEPTED

- There is no sound automatic rule for this. Examples: capping Digital Presence by Systems, or averaging zones.
- **Decision.** Enforced as a mandatory QA checklist attestation ("Scores do not reward aesthetics over conversion infrastructure"), not as code. Inventing a formula would violate "do not invent business rules."

### C-15 · Recurring revenue in the Revenue Gap formula — ACCEPTED

- BD and 01 §5: Gap = Target − Collected − Contracted near-term. Recurring revenue is a required *input*, but it is not in the formula.
- **Decision.** Do not subtract recurring revenue separately. Recurring revenue already collected is in "Collected." Recurring revenue contracted for the period is in "Contracted near-term." Subtracting it again would double-count. It is displayed as its own line.

### C-16 · Leak formula multiplier "× 4" vs "Weeks Per Month" — ACCEPTED

- 03 §5 and BD §12 use "× 4." BD also lists "Weeks Per Month" as a supported variable.
- **Decision.** `weeksPerMonth` is a stored variable, defaulting to 4 with state ASSUMPTION, so the literal doctrine formula stays reproducible and remains editable.

### C-17 · Build timing vs the founder resource law — ACCEPTED, flagged to founder

- 02 §14 GTM, Days 1–30: "Sell and learn … **Do not rebuild the app** or broaden ICP."
- 01 §13 caps product/app work at **10%** of founder business time. 00 repeats this.
- 03 §14's Resource Law says software gets resources "only when [it compresses] validated loops."
- **Decision.** The build proceeds because the founder directed it. The app build does not have to consume founder hours, but founder *review* time does. The implementation plan therefore puts the pieces that compress the current selling and delivery loop first: evidence → diagnostic → QA → report. Everything else is gated.
- This conflict is surfaced to the founder rather than silently resolved.

### C-18 · Market / Blue Ocean / Intervention Library in 04 vs BD MVP 1 — ACCEPTED (BD)

04 §23 already places these in MVP 2–4. BD excludes them. They are absent from MVP 1 schema and navigation. Only `Offer` + `Hypothesis` exist, because Validation (BD §7) needs them.

### C-19 · Decision role / authority level vocabularies are undefined — PROPOSED

- BD requires `authority level` and `decision role` on Contact. No source enumerates the values.
- **Proposed.**
  - `AuthorityLevel` = DECISION_MAKER / INFLUENCER / GATEKEEPER / UNKNOWN.
  - `DecisionRole` = ECONOMIC_BUYER / CHAMPION / TECHNICAL_EVALUATOR / END_USER / UNKNOWN.
- These are minimal, common sales vocabulary. 04 §28 requires authority to be known before proposals, which only needs DECISION_MAKER vs not.

### C-20 · Demand-source qualification — ACCEPTED

- 01 §13 and 04 §28: "Reject or defer prospects with no meaningful demand source when the proposed intervention is conversion infrastructure."
- **Decision.** `Opportunity.demandSourceState` = NONE / WEAK / MEANINGFUL / UNKNOWN. Advancing to QUALIFIED requires MEANINGFUL, or a recorded override reason, which is audit-logged. Enforced in the Phase 2 domain service.

### C-21 · Opportunity stage rules beyond the qualification gate — ACCEPTED (Phase 2)

Sources: 04 §28 ("Require authority/decision process before generating a commercial proposal"), 01 §6 and 04 §11 ("deferred with date"), and 01 §9 ("next decision on every live deal").

- **PROPOSAL** requires `authorityState = CONFIRMED`. There is no override: the source says *require*.
- **Qualification gate.** Entering QUALIFIED or any later stage from an unqualified stage runs the C-20 gate. Skipping stages does not bypass it.
- **Next action.** Every live stage (Target → Proposal, and Deferred) requires a next action and a date. Deferring without a date is blocked.
- **DISQUALIFIED** requires a reason, which is stored on the opportunity.
- **WON** is terminal in MVP 1. Post-sale work belongs to Deal/Install (MVP 2–3), per C-06.
- **Reopening.** LOST and DISQUALIFIED reopen only to TARGET, with a reason. Qualification resets to UNASSESSED.
- **Overrides.** Qualification overrides are stored in the audit log with the prefix `QUALIFICATION OVERRIDE:`, so they can be counted later.
- **Contacts.** An opportunity's primary contact must belong to the same client. This is enforced in the service.

### C-22 · Diagnostic evidence rules beyond the source text — ACCEPTED (Phase 3)

These operationalize "Evidence before certainty" (03 §2 Law 2, 04 §7) and "Every score … traceable to evidence" (04 §8). Each is enforced in a pure domain function or a service, and tested.

- **Initial evidence state.** Evidence starts NOT_VERIFIED. Capturing it in any other state requires a written basis. VERIFIED also requires a source URL or an attached file (E1 applied at capture).
- **Finding certainty.** A finding cannot claim more certainty than its linked evidence:
  - VERIFIED needs at least one linked VERIFIED item.
  - CLIENT_PROVIDED needs a linked CLIENT_PROVIDED or VERIFIED item.
  - ASSUMPTION and NOT_VERIFIED findings are always allowed, because they are visibly labeled (`domain/evidence/finding-state.ts`).
- **Score changes.** Changing an existing zone score requires a reason, stored as the `SCORE_CHANGE` audit reason. A first score is logged with an automatic reason.
- **Live re-checks.** Zone scores are re-checked against their evidence on every view. A later evidence downgrade shows the score in red with the rule it now breaks. QA (Phase 4) blocks it.
- **Sections.** A section can be marked COMPLETE only with a written summary.
- **Evidence scope.** Evidence can only be linked within its own diagnostic.
- **Reopening QA.** Any content edit to a diagnostic after QA returns it to NOT_READY, and that change is audit-logged. Edits to a FINALIZED diagnostic are rejected everywhere (L3).

