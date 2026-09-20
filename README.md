# Ledgerline

UPI spend dashboard: HDFC PDF import, Gmail bank-mail pooling, Postgres, JWT auth.

```
frontend/   Next.js 16 (App Router)
backend/    Express 5 · domain modules (auth, imports, gmail, rules, providers)
scripts/    Docker secrets + production safety checks
```

## Docker

```bash
cp .env.example .env
./scripts/generate-docker-secrets.sh
# set POSTGRES_PASSWORD to a unique value (not the example default)

./scripts/docker-prod-check.sh --compose
docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:4000 — `/live` `/ready` `/health`
- Logs: `docker compose logs -f api` (JSON, secrets redacted)

Production overlay (no published Postgres port):

```bash
./scripts/docker-prod-check.sh --strict --compose
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

Optional Gmail worker: `docker compose --profile worker up --build`

`docker-prod-check.sh` fails on empty/insecure secrets, default DB passwords, and `ALLOW_ANON_PARSE=1`.

## Local (without full Docker)

```bash
docker compose up -d postgres
cp backend/.env.example backend/.env   # set JWT_SECRET + ENCRYPTION_KEY
npm --prefix backend install && npm --prefix backend run migrate && npm --prefix backend run dev
npm --prefix frontend install && npm --prefix frontend run dev
```

Invite code: `beta-ledgerline`. Tests: `DATABASE_URL=memory npm --prefix backend test`.

## Env (see `.env.example`)

| Variable | Notes |
|----------|--------|
| `JWT_SECRET` | ≥16 chars; known defaults blocked in production |
| `ENCRYPTION_KEY` | 64 hex chars (32-byte AES key) |
| `DATABASE_URL` | Postgres URL (`memory` is test-only) |
| `CORS_ORIGINS` / `FRONTEND_URL` | Allowlist + OAuth redirect origin |
| `NEXT_PUBLIC_API_URL` | Browser → API origin (baked into the web image) |
