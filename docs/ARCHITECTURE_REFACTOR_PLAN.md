# Architecture Refactor Plan

## Audit Summary
Ledgerline is a modular monolith with good foundations: typed config, SQL migrations, a `Store` abstraction, structured logging, request validation, and clear product flows around statement imports and Gmail pooling.

The main architectural problems were not missing primitives, but inconsistent boundaries:

1. Route handlers and app bootstrap logic still contained business orchestration.
2. Gmail alert ingestion and PDF import ingestion did not share one deterministic classification boundary.
3. Query validation and PDF error mapping were duplicated.
4. Runtime configuration still leaked through scattered `process.env` reads.
5. Frontend API usage had type drift, including a Gmail backfill response mismatch.
6. `PostgresStore` remains too large and still owns many unrelated query groups.

## Refactor Principles
- Keep the system a modular monolith.
- Preserve product behavior unless the previous behavior contradicted documented architecture or produced incorrect results.
- Prefer a few meaningful seams over many trivial files.
- Treat the `Store` as the current persistence boundary while moving toward repository-by-domain extraction.

## Completed In This Refactor Pass
### Phase 1: Boundary Cleanup
- Centralized remaining backend runtime flags in `backend/src/config.ts`.
- Removed duplicated PDF parse error handling into shared import utilities.
- Centralized dashboard query validation with Zod.
- Added explicit controller/service seams for import and Gmail hot paths.
- Unified Gmail alert and PDF ingestion under one deterministic classification function.
- Fixed frontend typed API drift for Gmail backfill responses.
- Added explicit frontend/backend `typecheck` scripts.

### Behavior Fixes
- Provider-registry matches now take precedence over user rules, matching the documented classification order.
- Gmail alert ingestion now classifies through the same provider/rule/amount-band/other flow as PDF imports.
- Gmail enable-pooling no longer silently defaults to a hard-coded month when the request omits one.

## Next Phases
### Phase 2: Repository Extraction
- Split `PostgresStore` by domain query ownership:
  - auth/users
  - imports/transactions
  - gmail/pooling
  - rules/providers/categories
- Keep repository modules concrete and query-owning; do not introduce generic CRUD wrappers.

### Phase 3: Import Pipeline Isolation
- Extract the remaining PDF parsing and normalization concerns from `parser.ts` into:
  - PDF extraction
  - bank adapter parsing
  - normalization
  - analytics assembly
- Add parser fixtures per supported bank layout.

### Phase 4: Frontend Feature Organization
- Move API calls and state orchestration closer to features:
  - dashboard
  - imports
  - gmail/pooling
  - settings/rules
- Continue lifting shared primitives into `components/layout` or `lib`.

### Phase 5: Persistence and Security Hardening
- Add repository-level integration tests against Postgres.
- Verify Gmail push endpoint cryptographically before any public rollout.
- Revisit session transport (`localStorage` JWT vs secure cookies) when product scope expands.

## Explicitly Deferred
- Microservices, queues, Redis, or DI frameworks.
- Over-splitting route/service code into many tiny files.
- ORM adoption while query volume remains manageable by hand-written SQL.
