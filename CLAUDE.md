@AGENTS.md

# RIBM Revenue Spine App OS — agent notes

- Read `/docs/DECISIONS.md` and `/docs/DOMAIN_MODEL.md` before changing behavior. Source-of-truth priority: doc 04 › 01 › 03 › 02 › 00. Record any new conflict or decision in DECISIONS.md.
- Business rules live in `src/domain/` as pure functions with tests. Server actions call them; never re-implement a rule in UI or persistence code.
- Never: default evidence to VERIFIED, compute a number from insufficient data, publish a report before QA_PASSED, mutate a finalized diagnostic or a published report snapshot, select `promptText` / `internalNotes` / `operatorNotes` in a CLIENT-reachable path.
- Every server action: Zod-validate input, `requireActionPermission()`, `assertClientAccess()` for client-scoped data, and `writeAudit()` inside the same transaction for critical mutations.
- AI calls go through `src/server/ai/` adapters only. UI labels: "Analyze Evidence", "Generate Diagnosis", "Run QA" — never model names.
- Run `npm run typecheck && npm run lint && npm test && npm run build` before committing.
