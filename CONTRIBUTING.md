# Contributing

## Local Development
Ledgerline is a modular monolith with a Next.js frontend and an Express + TypeScript backend.

Run services in separate terminals:

```bash
docker compose up -d postgres

npm --prefix backend install
npm --prefix backend run dev

npm --prefix frontend install
npm --prefix frontend run dev
```

Optional worker:

```bash
npm --prefix backend run dev:worker
```

Frontend runs on `http://localhost:3000`. Backend runs on `http://localhost:4000`.

## Environment Setup
Backend environment variables are validated at startup in `backend/src/config.ts`.

Required for normal local development:
- `DATABASE_URL`
- `JWT_SECRET`
- `ENCRYPTION_KEY`

Common optional variables:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `FRONTEND_URL`
- `CORS_ORIGINS`
- `LOG_LEVEL`
- `LOG_PRETTY`
- `POOLING_WORKER_SEPARATE`
- `POOLING_WORKER_HOST`
- `POOLING_WORKER_PORT`
- `POOLING_WORKER_INTERVAL_MS`

Guidelines:
- Use `DATABASE_URL=memory` only for tests or temporary local debugging.
- Never use insecure secrets outside throwaway local development.
- Do not access `process.env` directly in new backend code. Add new config in `backend/src/config.ts`.
- Frontend environment access should stay centralized in `frontend/src/lib/config.ts`.
- The separate pooling worker binds to `127.0.0.1` by default and should stay on a private interface unless additional auth is added.

## Testing
Backend:

```bash
npm --prefix backend test
```

Frontend:

```bash
npm --prefix frontend test
```

Test priorities:
- classification
- parsing and normalization
- dedupe
- rules
- repository behavior
- dashboard aggregations
- typed frontend API contracts

## Linting
Frontend lint:

```bash
npm --prefix frontend run lint
```

The backend currently relies on TypeScript compilation and focused tests more than a dedicated lint pipeline. If you add backend linting, keep it incremental and avoid noisy rule churn.

## Typechecking
Backend:

```bash
npm --prefix backend run typecheck
```

Frontend:

```bash
npm --prefix frontend run typecheck
```

## Build
Backend:

```bash
npm --prefix backend run build
```

Frontend:

```bash
npm --prefix frontend run build
```

## Migration Workflow
Create numbered SQL migrations in `backend/src/db/migrations/`.

Apply migrations:

```bash
npm --prefix backend run migrate
```

Rollback the latest migration:

```bash
npm --prefix backend run migrate:down
```

Rules:
- Keep SQL close to the domain it serves, even while migrations remain centralized.
- Prefer additive schema changes over destructive changes during active refactors.
- Update tests or seeds when schema changes affect product flows.

## Coding Conventions
- Prefer incremental refactors over rewrites.
- Keep routes thin.
- Put business decisions in services.
- Keep database details behind the store or repository boundary.
- Keep external SDK and API details inside integration modules.
- Keep validators in `backend/src/validators/`.
- Avoid `any` and unsafe casts unless there is no reasonable alternative.
- Prefer explicit names over vague helpers such as `manager`, `processor`, or `common`.
- Do not create folders or abstraction layers just for appearance.
- Preserve current behavior unless a behavior change is required to fix a clear bug or architectural mismatch.

## Adding Features
For a new API endpoint:
1. Add a Zod schema.
2. Add a thin route.
3. Put orchestration in a service.
4. Reuse typed API helpers on the frontend.
5. Add tests close to the changed business logic.

For a new bank parser:
1. Add an adapter under `backend/src/adapters/`.
2. Register it in `backend/src/adapters/index.ts`.
3. Add parser-specific tests.
4. Update bank presets if sender defaults are needed.

For a new integration:
1. Create a dedicated integration module.
2. Normalize external payloads before they reach application services.
3. Convert infrastructure failures into app-level errors.

## Verification Before Merging
Run the relevant checks for the areas you changed:

```bash
npm --prefix backend test
npm --prefix backend run typecheck
npm --prefix backend run build
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

Inspect the diff for:
- boundary leaks
- duplicated logic
- unnecessary abstractions
- behavior changes
- missing tests
- sensitive logging
