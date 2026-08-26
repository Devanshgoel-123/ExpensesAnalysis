# Ledgerline Architecture

Ledgerline is an incremental modular monolith for ingesting bank statements, classifying UPI spends, and serving dashboard analytics. The current design favors explicit boundaries, typed validation, and a single deployable backend over premature distributed systems.

## Project Structure
```text
backend/src/
  api/                  # Health endpoints
  accounts/             # Bank preset and sender-allowlist HTTP surface
  adapters/             # Bank-specific PDF parsers
  analytics/            # Dashboard aggregations from persisted rows
  auth/                 # JWT, Google login bootstrap, auth routes
  categories/           # Category APIs and amount-band metadata
  crypto/               # Fingerprints and encrypted secret helpers
  db/                   # Store contract, Postgres implementation, migrations, seeds
  errors/               # AppError and global error translation
  gmail/                # Gmail integration, pooling services, controllers, jobs
  imports/              # Import controllers, import services, classification orchestration
  logger/               # Structured logging setup
  middleware/           # Request context, logging, security, validation, rate limits
  providers/            # Provider registry APIs
  preferences/          # User preferences APIs
  rules/                # User rules APIs and rule engine
  validators/           # Zod request schemas
  worker/               # Standalone pooling worker process

frontend/src/
  app/                  # Next.js app router entrypoints
  components/           # UI composition, views, panels, and layout primitives
  lib/                  # Auth, typed API client, shared formatting and date helpers
  test/                 # Frontend test setup
```

## Directory Responsibilities
- `backend/src/app.ts` wires middleware and routes, but should not own business logic.
- `backend/src/*/routes.ts` should stay thin and delegate into controllers or services.
- `backend/src/*/service.ts` owns application orchestration and business rules.
- `backend/src/gmail/client.ts` is the Gmail integration boundary. It owns OAuth and Gmail SDK details.
- `backend/src/db/postgres.ts` is the current SQL boundary. It remains too large and is the next major extraction candidate.
- `backend/src/adapters/` owns bank-specific parsing, not persistence or classification policy.
- `frontend/src/components/dashboard/` renders feature views; `frontend/src/lib/api.ts` is the typed boundary to backend APIs.

## Dependency Rules
Backend dependency direction:

1. Routes
2. Controllers
3. Services
4. Persistence boundary (`Store` today, repositories by domain over time)
5. Database

External dependency direction:

1. Services
2. Integrations
3. External APIs

Rules:
- Domain logic must not depend on Express request/response objects.
- Gmail-specific code must stay behind the Gmail integration boundary.
- Persistence details must not leak into route handlers.
- Validators stay in `validators/` and are consumed through `middleware/validate.ts`.
- New abstractions must be concrete and domain-owned, not generic wrappers.

## Request Lifecycle
Typical backend request flow:

1. Request enters Express.
2. `requestContext` assigns or propagates `requestId`.
3. Security middleware applies CORS and security headers.
4. Request logging and rate limiting run.
5. Zod validation parses request body, params, or query.
6. Route delegates to controller/service code.
7. Service loads domain data through the store boundary.
8. Response is mapped to JSON.
9. Errors are translated by the global error handler into an app-level envelope.

## Auth Flow
Ledgerline currently supports JWT bearer auth with Google-first onboarding.

1. Frontend starts sign-in through `/api/auth/google`.
2. Backend redirects to Google OAuth.
3. OAuth callback exchanges the code, validates the returned email, and creates or logs in the user.
4. Backend signs a short-lived session JWT and redirects back to the frontend with the token.
5. Frontend stores the token and uses it for authenticated API calls.

Notes:
- Google login currently also captures Gmail consent so a later Gmail connect can reuse the identity context.
- Tokens and secrets are validated at boot through typed config.
- For a future security pass, httpOnly cookies remain the likely upgrade path.

## Gmail Flow
Gmail is treated as an external integration with application decisions kept in services.

Integration responsibilities:
- OAuth client creation
- auth URL generation
- token exchange
- Gmail API calls
- history sync
- attachment fetch
- watch renewal

Application responsibilities:
- sender allowlist enforcement
- month window selection
- dedupe
- classification
- import orchestration
- persistence
- audit logging

Pooling modes:
- `backfill`: query-based bounded scan for alert mail and statement PDFs
- `poll`: incremental Gmail history sync
- `push`: optional Pub/Sub-triggered poll path

Important constraints:
- Only configured bank sender domains or emails are searched.
- OAuth scope is `gmail.readonly`.
- Message bodies are processed in memory for parsing/classification and are not persisted as arbitrary mailbox content.
- The push endpoint is still a private-beta path and needs stronger verification before any public exposure.

## PDF And Import Flow
Import pipeline shape:

1. Raw PDF upload or Gmail attachment bytes
2. PDF text extraction
3. Bank adapter parsing
4. Transaction normalization
5. Dedupe by attachment hash, Gmail message id, and transaction fingerprint
6. Classification
7. Persistence
8. Dashboard analytics assembly

This pipeline is intentionally adapter-based so more banks can be added without rewriting import orchestration.

## Classification Flow
Classification is deterministic and independently testable through `backend/src/imports/classification.ts`.

Precedence:
1. Provider registry
2. User rules
3. Amount-band heuristic
4. `other`

Details:
- Provider registry matches narration aliases and UPI handle substrings.
- User rules can assign payee, provider, or category.
- Amount-band heuristics currently support the cigarettes bucket through category metadata.
- Gmail alert ingestion and PDF import ingestion now use the same classification boundary.

## Database Architecture
Current persistence boundary:
- `backend/src/db/types.ts` defines the `Store` contract.
- `backend/src/db/index.ts` selects `MemoryStore` for tests or `PostgresStore` for real persistence.
- `backend/src/db/migrations/` contains ordered SQL migrations.

Key entities:
- `users`
- `accounts`
- `imports`
- `transactions`
- `providers`
- `categories`
- `user_rules`
- `gmail_connections`
- `mail_messages`
- `pooling_runs`

Important uniqueness constraints:
- `imports(user_id, gmail_message_id)`
- `imports(user_id, attachment_hash)`
- `transactions(user_id, fingerprint)`

Current trade-off:
- The `Store` interface already keeps application services unaware of connection details.
- `PostgresStore` still groups too many unrelated queries and should be split by domain ownership over time.

## Frontend Architecture
The frontend is a Next.js app-router client with feature-oriented view composition.

Current structure:
- `Dashboard.tsx` owns dashboard-level server-state orchestration.
- `DashboardViewRouter.tsx` switches between high-level feature views.
- `BankPoolingPanel.tsx` and `SettingsPanel.tsx` handle Gmail and user configuration workflows.
- `lib/api.ts` is the typed backend boundary.
- `lib/month.ts` and other helpers hold shared UI-safe utilities.

Guidelines:
- Keep business-specific panels separate from reusable layout primitives.
- Prefer typed API helpers over inline `fetch` calls.
- Keep server state in feature owners; avoid introducing global state libraries without a concrete need.

## Testing Strategy
Backend priorities:
- classification precedence
- PDF parsing and line stitching
- rule matching
- analytics aggregation
- Gmail alert parsing
- repository behavior as domain-specific query modules are extracted

Frontend priorities:
- dashboard calculations and rendering
- typed API integration assumptions
- settings and pooling interactions where UI state and API contracts meet

Testing rules:
- Favor fast unit tests for business logic.
- Mock or fake external integrations such as Gmail.
- Use the memory store for most backend unit tests.
- Add Postgres-backed integration tests when extracting repository modules from `PostgresStore`.

## How To Add A Bank Parser
1. Create a concrete adapter in `backend/src/adapters/`.
2. Keep the adapter responsible only for parsing and normalization of that bank’s statement format.
3. Export the adapter from `backend/src/adapters/index.ts`.
4. Add focused parser fixtures or tests for edge cases.
5. Add or update a bank preset and sender allowlist defaults if appropriate.
6. Do not move persistence, classification, or Gmail logic into the adapter.

## How To Add An External Integration
1. Create or extend a dedicated integration module under a domain folder such as `gmail/`.
2. Keep SDK, auth, and raw API details inside that module.
3. Expose application-safe methods that return normalized data.
4. Call the integration only from services.
5. Translate infrastructure failures into `AppError` or domain-safe failures before they reach the client.
6. Add mocks or fakes for test coverage.

## How To Add A New API Endpoint
1. Define request schemas in `backend/src/validators/`.
2. Add or extend a route in the relevant domain folder.
3. Keep the route thin and validate through `validate(...)`.
4. Put orchestration in a controller or service, not inline in the route.
5. Reuse the store boundary instead of reaching for raw SQL outside `db/`.
6. Add backend tests for the business logic and frontend typed API changes if the endpoint is consumed by UI.

## Known Architectural Debt
- `PostgresStore` is still oversized and should be split by domain query ownership.
- Some domain folders still have direct route-to-store coupling and should move toward the same controller/service pattern used in imports and Gmail.
- Gmail push still needs stronger verification before public exposure.
- The standalone pooling worker now binds to localhost by default, but if it is ever exposed off-host it will need authentication or network isolation.
- Frontend auth transport is still JWT in browser storage.
