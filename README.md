# Ledgerline — multi-user UPI expense product (private beta)

Parse bank / UPI statement PDFs, save them per user, track people with dynamic rules, improve provider branding, and optionally backfill statements from Gmail.

## Stack

- `frontend/` — Next.js dashboard (invite-only auth)
- `backend/` — Express API (JWT auth, imports, rules, providers, Gmail)
- Postgres optional (`docker compose`); defaults to in-memory store for local/dev

## Quick start

```bash
# Optional Postgres
docker compose up -d

# Backend
cd backend
cp .env.example .env
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Default invite code: `beta-ledgerline` (from `INVITE_CODES`)

Set `DATABASE_URL=memory` in `backend/.env` to run without Postgres.

## Product features

1. **Invite-only accounts** — register with invite code, JWT sessions, account deletion.
2. **Saved imports** — authenticated PDF upload persists transactions with dedupe fingerprints.
3. **Dynamic people/categories** — user rules replace hardcoded names; suggestions from frequent counterparties.
4. **Provider registry** — curated logos under `/providers/*.svg` (no misleading favicons for people).
5. **Gmail backfill** — optional `gmail.readonly` OAuth + bounded statement search. Restricted Google scope: private-beta test users only until verification/assessment.

## API surface

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/register` | no | Invite registration |
| POST | `/api/auth/login` | no | Login |
| GET/DELETE | `/api/auth/me` | yes | Profile / wipe data |
| POST | `/api/parse` | yes | Upload + persist statement |
| GET | `/api/imports/dashboard` | yes | Aggregated dashboard |
| PATCH | `/api/imports/transactions/:id` | yes | Correct txn (+ optional future rule) |
| CRUD | `/api/rules` | yes | Tracking rules |
| GET | `/api/providers` | yes | Provider registry |
| * | `/api/gmail/*` | yes* | Connect, backfill, sync, push |

\* `/api/gmail/callback` and `/api/gmail/push` are browser/Pub/Sub entrypoints.

## Tests

```bash
cd backend
npm test
```

Runs parser smoke tests + productization tests (auth, tenancy, dedupe, rules, crypto).

## Gmail setup (optional)

1. Create a Google Cloud OAuth client (web).
2. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
3. Add test users on the OAuth consent screen (External + Testing).
4. Connect from Account & automation, then run backfill.

**Compliance note:** `gmail.readonly` is restricted. Public launch needs Google OAuth verification and a security assessment when mailbox data is stored server-side.
