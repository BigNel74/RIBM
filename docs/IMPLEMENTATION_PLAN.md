# RIBM Revenue Spine App OS: Implementation Plan (MVP 1)

Complexity scale: **S** is under 1 day, **M** is 1–3 days, **L** is 3–6 days (engineering time, not founder time).
Every phase ends with the same checks: `npm run typecheck && npm run lint && npm test && npm run build`, all green.

Sequencing principle (DECISIONS C-17): build what compresses the live selling and delivery loop first. That loop is **evidence → diagnostic → QA → report**. Command, Validation, and Claims come after it and stay thin.

---

## PHASE 0: Foundation

**Status: done in session 1.**

- **Objectives:** a bootable app, toolchain, database connectivity, a design-token baseline, and documentation.
- **Files and modules:**
  - Next.js app scaffold at the repository root
  - `package.json` scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `db:*`
  - `.env.example`
  - `src/app/layout.tsx`, `globals.css` (tokens)
  - `src/server/db.ts`
  - `/docs/*`
- **Migrations:** none of its own (see Phase 1).
- **Acceptance criteria:**
  - `npm run dev` boots.
  - `npm run build` passes.
  - The database connection is configured via `DATABASE_URL`.
  - No secrets are committed.
- **Tests:** the Vitest harness runs.
- **Dependencies:** Node ≥20.9, PostgreSQL.
- **Complexity:** S.
- **Non-goals:** deployment, CI, Docker, a component library.

## PHASE 1: Data model, auth, and roles

**Status: done in session 1.**

Delivered:

- 132 unit tests and 8 database integration tests pass.
- Login, logout, and role gating were checked in a browser against a production build:
  - ADMIN reaches Settings.
  - OPERATOR gets a 403.
  - CLIENT is confined to `/portal` and sees no internal fields and no other clients.

- **Objectives:**
  - A full MVP 1 schema, so later phases add behavior, not tables.
  - Framework seed data.
  - Authentication and role-based permissions.
  - An audit logger.
  - Pure domain rules for the critical invariants.
- **Files and modules:**
  - `prisma/schema.prisma`
  - `prisma/migrations/*_init`
  - `prisma/seed.ts`
  - `src/server/auth/{password,session,permissions,guards}.ts`
  - `src/server/audit/log.ts`
  - `src/domain/{evidence,scoring,command,leak,qa,claims,validation,diagnostics}/*`
  - `src/app/(auth)/login`
  - `src/app/(app)/layout.tsx` (nav shell)
  - `src/app/(app)/settings/users` (ADMIN-only proof of role enforcement)
- **Migrations:** `init`. This creates all MVP 1 tables, enums, the CHECK constraint on score range, and `Restrict` deletes on evidence links.
- **Seed data:**
  - Admin user (from environment variables only)
  - FrameworkVersion `RS-FW-2.1`
  - ScoringVersion `RS-SC-1.0`, with the founder-confirmed rules from C-12 and C-13
  - ReportTemplateVersion `RS-RT-1.0`
  - PromptVersion `RS-PR-0.0` (placeholder, no prompt text)
  - The 5 zones and 15 sections
  - Offers with statuses per C-05
- **Acceptance criteria:**
  - ADMIN and OPERATOR can log in.
  - OPERATOR is denied on `/settings/users` server-side.
  - A CLIENT user without a `clientId` is rejected.
  - The seed is idempotent.
- **Tests:**
  - Permission matrix: OPERATOR can't `framework:manage`; CLIENT can't read another client.
  - Evidence transitions: ASSUMPTION never silently becomes VERIFIED.
  - Score range and threshold rules.
  - QA transitions and the publish gate.
  - Claim verification gate.
  - Revenue command math, plus the insufficient-data path.
  - Leak exposure labeling.
  - Confidence levels and the VALIDATED rule.
  - Session token hashing.
- **Dependencies:** Phase 0.
- **Complexity:** M.
- **Non-goals:**
  - Password reset
  - Invitations
  - OAuth
  - MFA (Phase 7 decision)
  - CRUD UIs beyond users

## PHASE 2: Clients, contacts, and opportunities

**Status: done in session 2.**

Delivered:

- Pages:
  - Client list, create, profile edit, and contacts with add/edit.
  - Opportunity list with stage filter, overdue banner, and next-action sort.
  - Opportunity create (client first, PRIMARY offer preselected).
  - Qualification editing, a stage-change panel showing gate gaps, and a per-opportunity history.
- Stage rules in `src/domain/opportunities/stage-rules.ts` (C-20, C-21).
- Admin-only framework adoption form (C-02).
- Tests: 159 unit tests and 19 database tests pass.
- Browser-checked end to end:
  - Validation errors show on the right fields.
  - The qualification gate blocks, and fixing the signals clears it.
  - SALES_ADVISOR can advance stages but cannot create or edit clients or contacts.

- **Objectives:** operators can record accounts and move opportunities through the MVP stages with qualification discipline.
- **Files and modules:**
  - `src/server/clients/*`, `src/server/opportunities/*` (services and server actions, Zod input schemas)
  - `src/domain/opportunities/stage-rules.ts`
  - `app/(app)/clients/**`, `app/(app)/opportunities/**`
- **Migrations:** none expected, beyond small field adjustments found in use.
- **Acceptance criteria:**
  - Create and edit Client and Contact records.
  - Create an Opportunity, then change its stage.
  - Moving to QUALIFIED requires `authorityState ≠ UNKNOWN` and `demandSourceState = MEANINGFUL`, or an override reason that is audit-logged (C-20).
  - DISQUALIFIED requires a reason.
  - Every opportunity shows its next action and next action date. Overdue items are flagged.
  - Stage changes are audit-logged.
- **Tests:**
  - Stage-rule unit tests
  - Service tests against a test database: CLIENT denied; SALES_ADVISOR can change stage but not edit evidence
- **Dependencies:** Phase 1.
- **Complexity:** M.
- **Non-goals:**
  - Email sync
  - Sequences
  - Pipeline automation
  - Kanban drag-and-drop
  - Import tools (CSV import only if manual entry proves too slow)

## PHASE 3: Evidence, diagnostics, and scoring

**Status: done in session 3.**

Delivered:

- **Diagnostic workspace** with tabs: intake, evidence, five zones, 15 sections, findings, exposure, priority plan, summary.
- **Evidence capture.** Screenshots and PDFs are stored privately (ADR-015). State changes are explicit, and referenced evidence cannot be deleted.
- **Scoring.** Zone scores are validated against the pinned scoring version. Evidence is shown beside each score, and scores are re-checked on every view.
- **Finding certainty rule** (C-22).
- **Exposure scenarios** with per-input evidence states.
- **Priority plan** with a dense ranking.
- **Enforcement.** QA resets on any edit, and finalized diagnostics are immutable.
- **Tests:** 37 database tests, including the BD §24 checks for finalized-version retention, evidence relationships, and audit-on-score-change.
- **No generation buttons** (ADR-013).

- **Objectives:** the core laboratory. Capture evidence, build a diagnostic pinned to versions, score the five zones, complete the 15 sections, record findings, model leak scenarios, and rank priority fixes.
- **Files and modules:**
  - `src/server/evidence/*`, including file upload to private storage with a content-type allowlist and a size cap
  - `src/server/diagnostics/*`
  - `src/server/ai/port.ts` plus a `NullGenerator` (manual mode). The button labels "Analyze Evidence", "Generate Diagnosis", and "Generate Priority Plan" are wired to the port. A vendor adapter comes behind a feature flag once the manual flow is proven.
  - `app/(app)/diagnostics/[id]/**`: tabs for Intake / Evidence / Zones / Sections / Findings / Leak / Priority Plan. The scoring view shows linked evidence next to each score.
- **Migrations:** possibly a file-storage metadata column.
- **Acceptance criteria:**
  - A new diagnostic pins the active framework and scoring versions.
  - Its 5 ZoneScores and 15 SectionResults are created from the pinned definitions.
  - A score of 7 or more is rejected without enough VERIFIED evidence, with the message shown inline.
  - Score and evidence-state edits are audit-logged with before and after values.
  - A leak scenario shows its result state and the label "Estimated revenue exposure".
  - Evidence referenced by any score, finding, or fix cannot be deleted.
- **Tests:**
  - The "finalized diagnostic retains version IDs" test runs against the database.
  - Evidence relationships stay intact after edits.
  - An audit row is written on score change.
- **Dependencies:** Phase 2.
- **Complexity:** L.
- **Non-goals:**
  - Automated website crawling
  - Page-speed APIs
  - Screenshot automation
  - Benchmark comparisons
  - Prescription or intervention selection (MVP 2)

## PHASE 4: QA and reports

**Status: done in session 4.**

Delivered:

- **QA & report tab.** Run QA with a checklist and attestations, see QA history, publish, withdraw, and finalize.
- **Client report `/r/[id]`.** Built from a frozen snapshot (ADR-017), mobile-first, printable to PDF, with the evidence state shown on every claim.
- **Reports list and client portal links.**
- **Tests:** 7 more database tests for the QA gate, publish lock, snapshot immutability after edits, republish/withdraw, client isolation, and finalization.
- **Browser check, end to end:** build a full diagnostic through the UI, fail QA without attestations, pass QA, publish, then open it as the client on a phone. The client sees 12 sections and no internal strings, the page has no horizontal scroll, and it exports a 4-page PDF.

- **Objectives:** a QA gate and a client report generated from structured data.
- **Files and modules:**
  - `src/server/qa/*`, using the Phase 1 domain `evaluateDiagnosticQa`
  - `src/server/reports/*`: snapshot builder, publish, client projection
  - `app/(app)/diagnostics/[id]/qa`
  - `app/(app)/reports/**`
  - `app/(client)/r/[reportId]`: mobile-first, print CSS for PDF via the browser
- **Migrations:** none expected.
- **Acceptance criteria:**
  - "Run QA" produces a checklist and sets QA_PASSED or QA_FAILED.
  - The two attestations (no fabricated metrics; aesthetics not over-rewarded, per C-14) are required.
  - Publishing fails unless the diagnostic is QA_PASSED or FINALIZED.
  - The published report is a frozen snapshot that carries its version IDs.
  - Report sections follow BD §14 order (C-07).
  - NOT_VERIFIED renders as "Not verified from available evidence."
  - A CLIENT user sees only their own published reports and no internal fields.
  - Print layout is legible.
  - The pages meet WCAG AA contrast.
- **Tests:**
  - Publish-gate integration test
  - Client isolation integration test
  - Projection test proving that `internalNotes`, `operatorNotes`, and `promptText` are absent
- **Dependencies:** Phase 3.
- **Complexity:** M.
- **Non-goals:**
  - DOCX export
  - Branded PDF rendering service
  - Email delivery of reports

## PHASE 5: Command dashboard

- **Objectives:** turn the cash target into one primary command.
- **Files and modules:**
  - `src/server/command/*`: loads the RevenuePeriod, and derives counts from Opportunities where possible
  - `app/(app)/command/page.tsx`: gap, required wins, proposals, and conversations, the primary command, a scenario-range panel, and founder capacity
- **Migrations:** none expected.
- **Acceptance criteria:**
  - All BD §6 inputs can be entered.
  - Derived values match the domain function.
  - With insufficient history, the dashboard shows INSUFFICIENT DATA and no numbers, and offers operator-entered scenario rates labeled ASSUMPTION.
  - It shows one primary command sentence.
  - Only the PRIMARY offer is shown, unless the operator opens portfolio view (04 §28).
  - No vanity charts.
- **Tests:** already covered by the Phase 1 domain tests, plus one service test for count derivation.
- **Dependencies:** Phase 2, which supplies opportunity counts.
- **Complexity:** S–M.
- **Non-goals:**
  - Forecasting by collection date
  - Pipeline coverage over time
  - Charts

## PHASE 6: Validation and claim registry

- **Objectives:** make market proof and public claims auditable.
- **Files and modules:**
  - `src/server/validation/*`
  - `src/server/claims/*`
  - `app/(app)/validation/**`: hypotheses, tests, evidence, decisions, per-dimension confidence, and 01 §13 gate pass/fail
  - Claims UI under `app/(app)/validation/claims` (or `settings/claims`)
- **Migrations:** none expected.
- **Acceptance criteria:**
  - A hypothesis cannot run without dates, sample target, success threshold, and kill condition.
  - Decisions are DOUBLE, TWEAK, PAUSE, or KILL, and each needs a rationale.
  - Confidence is computed per dimension with no overall probability.
  - An offer becomes VALIDATED only under the rule in document 00.
  - A quantitative claim cannot be marked VERIFIED without VERIFIED evidence, a cohort, a time window, a calculation, and ADMIN approval.
  - Expired claims show as EXPIRED.
  - The current website claims are seeded as DRAFT or BLOCKED records, so the founder sees exactly what is unproven.
- **Tests:** claim-gate and confidence tests (domain tests exist from Phase 1), plus service tests for approval permissions.
- **Dependencies:** Phases 1 and 3, since claims link to evidence.
- **Complexity:** M.
- **Non-goals:**
  - Blue Ocean canvas
  - Market intelligence
  - Automated website claim scanning

## PHASE 7: Hardening and tests

- **Objectives:** production readiness for internal use and first client-facing reports.
- **Scope:**
  - Playwright e2e for the critical path: login, create client, create diagnostic, add evidence, score, run QA, publish, client views.
  - Login rate limiting.
  - Security headers and CSP.
  - Founder adoption record for the FrameworkVersion (C-02).
  - Version management UI (ADMIN).
  - Audit log viewer (ADMIN).
  - Backup and restore note.
  - Deployment target decision (R9).
  - CI workflow (typecheck, lint, test, build).
  - Data retention and deletion controls.
  - Accessibility pass.
- **Acceptance criteria:**
  - Every BD §24 critical test is present and green.
  - The e2e critical path is green.
  - No high-severity `npm audit` findings.
- **Dependencies:** Phases 1–6.
- **Complexity:** M.
- **Non-goals:**
  - Multi-tenant orgs
  - Billing
  - SSO
  - Mobile apps

---

## BD §24 critical test mapping

| Critical test | Where |
|---|---|
| CLIENT cannot access another client's data | `server/auth/permissions.test.ts` (Phase 1, unit); integration in Phase 4 |
| OPERATOR cannot change Admin-only framework settings | `server/auth/permissions.test.ts` (Phase 1) |
| Finalized diagnostics retain historical version IDs | `domain/diagnostics/lifecycle.test.ts` (Phase 1, rule); DB integration in Phase 3 |
| ASSUMPTION cannot silently become VERIFIED | `domain/evidence/evidence-state.test.ts` (Phase 1) |
| Report publishing fails when QA has not passed | `domain/qa/diagnostic-qa.test.ts` (Phase 1); integration in Phase 4 |
| Unsupported quantitative claim cannot be marked VERIFIED | `domain/claims/claim-registry.test.ts` (Phase 1) |
| Revenue calculations behave correctly | `domain/command/revenue-command.test.ts`, `domain/leak/exposure.test.ts` (Phase 1) |
| Insufficient funnel data does not generate false precision | `domain/command/revenue-command.test.ts` (Phase 1) |
| Score range validation | `domain/scoring/score.test.ts` (Phase 1) + DB CHECK |
| Evidence relationships remain intact after edits | Phase 3 integration |
| Audit log records critical mutations | `server/audit/log.test.ts` (Phase 1, shape); integration in Phase 3 |
