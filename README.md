# RIBM Revenue Spine App OS

RUN It BAC Media's internal commercial operating system:
**Revenue Target → Opportunity → Evidence → Diagnosis → QA → Client Report → Decision.**

The Revenue Spine methodology is the product. AI is supporting infrastructure.


## Documentation

| Doc | Purpose |
|---|---|
| `/docs/BUILD_ASSESSMENT.md` | What exists, stack, risks, security |
| `/docs/IMPLEMENTATION_PLAN.md` | Phases 0–7 with acceptance criteria |
| `/docs/DOMAIN_MODEL.md` | Entities, enums, invariants, permission matrix |
| `/docs/DECISIONS.md` | Architecture decisions and source-document conflicts |
| `/docs/*.docx`, `/docs/source-text/` | Validated source documents (source of truth) |

## Local setup

Requires Node ≥ 20.9 and PostgreSQL ≥ 14.

```sh
cp .env.example .env          # set DATABASE_URL, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD (≥12 chars)
npm install                   # also runs prisma generate
npm run db:migrate            # applies prisma/migrations
npm run db:seed               # framework RS-FW-2.1, scoring RS-SC-1.0, offers, admin user (idempotent)
npm run dev                   # http://localhost:3000
```

## Checks

```sh
npm run typecheck
npm run lint
npm test          # domain + auth unit tests (no database needed)
npm run test:db   # schema/constraint integration tests (needs migrated + seeded DATABASE_URL)
npm run build
```

## Layout

```
prisma/            schema, migrations (incl. hand-written CHECK constraints + append-only audit trigger), seed
src/domain/        pure Revenue Spine rules — no I/O, no framework, fully unit-tested
src/server/        I/O boundary: db, auth (sessions, permissions, guards), audit log
src/app/           Next.js routes (UI only)
src/ui/            shared presentational components
```

Dependency rule: `app → server → domain`. `domain` never imports Prisma, Next.js, or a vendor SDK.
