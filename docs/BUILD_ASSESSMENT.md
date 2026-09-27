# RIBM Revenue Spine App OS: Build Assessment

**Date:** 2026-09-27  
**Repository:** `BigNel74/RIBM` (moved from `lexirise-clickable` on 2026-09-27)  
**Classification:** Long-term scale play, applied to the operational core of the agency cash engine. See §7 on timing.

---

## 1. What currently exists

| Area | Finding |
|---|---|
| Repository (at session 1) | `BigNel74/lexirise-clickable` (private), a **Lovable-generated LexiRise literacy prototype**, not RIBM. The app has since moved to `BigNel74/RIBM` (ADR-001). |
| Stack | Vite 5, React 18, TypeScript, react-router 6, Tailwind 3, shadcn/ui (about 50 Radix primitives), TanStack Query, Zod 3, Vitest 3, Playwright config. |
| Backend | **None.** No server, API, database, auth, or environment configuration. |
| Domain code | Student/teacher literacy screens: reading passage, comprehension check, GrowthPulse, class overview, content studio. All data is mocked in `src/data/contentLibrary.ts`. |
| Tests | One placeholder test, `src/test/example.test.ts`. |
| Design system | Teal/coral, with "no red anywhere in the UI" as a rule. This is the **opposite** of RIBM, where red means critical issues and primary commercial actions. |
| Git | Clean tree. The designated branch existed locally and on the remote at the same commit as `main`. |
| Lovable coupling | Pushes to `main` sync back to the Lovable editor. |
| Source documents | Five validated `.docx` files, supplied as uploads. Copied to `/docs/*.docx`, with text extractions in `/docs/source-text/*.md` so they can be diffed and searched. |
| Environment | Node 22.22, npm 10.9, PostgreSQL 16 installed locally (started for this session). No Docker daemon. |

## 2. Technical stack decision

The existing stack is kept for LexiRise and **not** extended for RIBM (ADR-002): a client-only SPA cannot enforce server-side authorization.

RIBM uses the directive's default stack in its own repository, `BigNel74/RIBM` (ADR-001, ADR-003):

| Layer | Choice | Pin |
|---|---|---|
| Framework | Next.js App Router, React Server Components, Server Actions | `next@16.3.6` |
| Language | TypeScript (strict) | `5.9.x` |
| UI | Tailwind CSS 4, hand-built accessible primitives (no heavy kit) | `tailwindcss@4` |
| Database | PostgreSQL | 16 |
| ORM | Prisma | `6.19.3` (not the 8.0 RC tagged `latest`) |
| Validation | Zod | `4.3.x` |
| Auth | First-party DB sessions + bcrypt (ADR-004) | `bcryptjs@3` |
| Tests | Vitest (unit/domain); Playwright later for critical e2e | `vitest@3.2` |
| Fonts | IBM Plex Sans / Mono, self-hosted via `@fontsource` | n/a |

## 3. Reusable assets

- **From this repo:** nothing functional. Tailwind and Zod habits carry over; the code does not.
- **From the source docs** (the real asset): the five-zone and 15-section framework, the evidence-state doctrine, scoring rules, leak formula, QA checklist, report sequence, confidence table, validation gates, claim-registry fields, offer statuses, and the permission table. All are encoded as seed data or pure domain functions.

## 4. Missing components (relative to MVP 1)

Everything. MVP 1 is greenfield. The build order is in `IMPLEMENTATION_PLAN.md`.

## 5. Source contradictions

Twenty conflicts are recorded with resolutions in `DECISIONS.md` Part B. The ones that matter commercially:

1. **C-03 / C-04:** Primary ICP and primary offer name differ between 02 and 01/04. Resolved to the local/professional-service Conversion Infrastructure wedge.
2. **C-11:** Three different validation instruments: gates (01), confidence levels (04), and the "VALIDATED" rule (00). All three are implemented in layers. VALIDATED uses the strictest rule.
3. **C-12 / C-13:** "Sufficient history" and "strong observable evidence" were undefined. The proposed rules were confirmed by the founder on 2026-09-27 and are stored in `ScoringVersion.rules`.
4. **C-02:** Every document says it governs only after formal adoption. No adoption record exists.
5. **C-17:** 02 says "do not rebuild the app" in days 1–30, and 01 caps app work at 10% of founder time. This build is in tension with the company's own resource law. See §7.

## 6. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | ~~RIBM app lived in the LexiRise/Lovable repo.~~ | Resolved | Moved to the dedicated repository `BigNel74/RIBM` on 2026-09-27 (ADR-001). |
| R2 | Build consumes founder attention during the 90-day sell-and-learn window (C-17). | High | Phase order puts evidence → diagnostic → QA → report first, because that loop is used on every sale. Command, Validation, and Claims are thin. Founder review is batched per phase. |
| R3 | Founder-confirmed scoring and sufficiency thresholds (C-12, C-13) turn out wrong for real engagements. | Medium | Stored as versioned config. Changing them bumps the ScoringVersion, and history stays reproducible. |
| R4 | Evidence discipline erodes under deadline pressure ("just mark it verified"). | High | No default-VERIFIED paths. Verification needs a reason and a source, and it is audit-logged. QA blocks reports that contain unlabeled material claims. |
| R5 | Unverified public claims on the current website ("3x avg booking increase", "65%+ gross margin"). | High (reputational/legal) | Claim Registry (Phase 6). Until then, 02 §14 already says to remove or qualify them. **This is a business action, not a software dependency.** |
| R6 | AI output presented as fact. | High | No model integration in Phase 0–1. Adapter boundary (ADR-010). Generated output lands as editable drafts in `NOT_VERIFIED` state. |
| R7 | Prisma/Next major-version churn. | Low | Pinned versions. Upgrades are explicit tasks. |
| R8 | Single-tenant assumption leaks into the design, making licensing harder later. | Low (deferred by doctrine) | Every client-scoped row carries `clientId`. Org-level tenancy is not built (01 §13 sequential-expansion rule). |
| R9 | No hosting or deployment target decided. | Medium | Not blocking for Phase 0–1. A managed Postgres plus a Node host is enough. Decide before first client-facing report (Phase 4). |

## 7. Strategic read (per the operating instructions)

- **Strongest part:** it encodes the one thing competitors don't have, an evidence-traceable diagnostic with QA and reproducible versions. The product is the methodology, so the software makes the methodology operable by someone other than the founder.
- **Weakest assumption:** that software is the bottleneck. Per 02 §14 and 00, the bottleneck in the first 90 days is **buyer, payment, and outcome proof**. The app does not create demand.
- **Hidden cost:** founder review hours, plus the temptation to perfect tooling instead of running five diagnostic conversations.
- **What must be true for it to pay off:** the evidence → diagnostic → QA → report loop gets used on real prospects within weeks, and it shortens founder time per diagnostic.
- **Kill or park criterion (proposed):** if no real diagnostic has run through the app by the end of Phase 4, freeze further phases and return the time to selling.

## 8. Recommended architecture

Modular monolith, organized by domain:

```
RIBM/
  docs/                   planning docs + validated source documents
  prisma/                 schema, migrations, seed (framework data)
  src/
    domain/               PURE business rules, no I/O, 100% unit-testable
      evidence/  scoring/  command/  leak/  qa/  claims/  validation/  diagnostics/
    server/               I/O boundary
      db.ts               Prisma client singleton
      auth/               password, session, permissions, guards
      audit/              append-only audit logger
      ai/                 (Phase 3+) provider adapter port, no vendor in domain
      <domain>/           services / server actions per domain (Phase 2+)
    app/                  Next.js routes (UI only; calls server/ services)
      (auth)/login
      (app)/command, opportunities, clients, diagnostics, validation, reports, templates, settings
      (client)/r/[reportId]   client report view (Phase 4)
    ui/                   shared presentational components
```

**Dependency rule:** `app → server → domain`. `domain` imports nothing from `server`, `app`, Prisma, or any vendor.

## 9. Dependencies

- **Runtime:** Node ≥20.9, PostgreSQL ≥14.
- **Environment variables:** `DATABASE_URL`, `SESSION_SECRET` (reserved for signing, if added), `NODE_ENV`. The seed script reads `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`. **No defaults are committed.**
- **External services:** none in Phase 0–1.

## 10. Security considerations

- **Authentication:** bcrypt cost 12. Tokens are 256-bit, and only the hash is stored. Cookies are httpOnly, SameSite=Lax, and Secure in production. Sessions are revocable server-side. Failed logins are audit-logged, and the response does not reveal whether the email exists.
- **Authorization:** one permission matrix. Server-side checks run in every action and loader. CLIENT users are bound to one `clientId`. Client-facing data goes through explicit field projections, so `internalNotes`, `operatorNotes`, and `promptText` are never selected for CLIENT.
- **Input:** Zod schemas at every server boundary. Prisma parameterizes queries (no raw SQL in app code).
- **Secrets:** only `.env.example` is committed. `.env*` is gitignored.
- **Audit:** append-only `AuditLog`, with high-priority events per BD §17.
- **Errors:** generic messages to users, details logged on the server only.
- **Files:** evidence screenshots and uploads are deferred to Phase 3. They will need content-type allowlisting, size limits, and non-public storage with signed URLs. Files are never served from `public/`.
- **Pending (Phase 7):** rate-limiting on login, CSRF review of server actions (Next's built-in origin check covers the default case), CSP headers, data-retention and deletion controls (04 §18).
