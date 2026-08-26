# Ledgerline architecture

Personal-use UPI expense product: bank statement PDFs (upload or Gmail pooling) → Postgres → category/provider classification → dashboard analytics (month-scoped, top UPI handles).

For ops/env/API tables see the root [README](../README.md). This document is the schema + pooling deep-dive.

---

## System overview

```mermaid
flowchart TB
  subgraph Client
    UI[Next.js Dashboard]
    BankSetup[Bank + sender allowlist]
    PoolBtn[Enable Pooling]
    Month[Month filter Aug default]
  end

  subgraph API[Express API]
    Accounts[/api/accounts]
    Gmail[/api/gmail]
    Imports[/api/imports]
    Providers[/api/providers]
    Store[Store repository]
  end

  subgraph Data
    PG[(PostgreSQL)]
  end

  subgraph Google
    OAuth[gmail.readonly OAuth]
    GmailAPI[Gmail messages.list]
  end

  UI --> BankSetup --> Accounts --> Store
  PoolBtn --> Gmail --> OAuth
  Gmail --> GmailAPI
  GmailAPI -->|"q=from:bank senders only"| Imports
  Imports --> Store --> PG
  Month --> Imports
  Providers --> Store
```

**Request path:** Client → helmet/CORS → request ID → rate limit → Zod → router → service → `Store` → Postgres.

---

## Category → provider model

Categories are lifestyle buckets. Providers (merchants/apps) are children via `providers.category_slug`.

| Category | Role | Seeded providers |
|----------|------|------------------|
| `food` | Food delivery / quick commerce | Swiggy, Bistro, Zepto, Ayodhya |
| `shopping` | Retail (extend as you add merchants) | — |
| `travel` | Trips / bookings | MakeMyTrip |
| `outing` | Local rides / outings | **Rapido**, District |
| `investments` | Brokers / SIPs | — (ready for Groww etc.) |
| `cigarettes` | Amount heuristic ₹25–60 | — |
| `other` | Fallback | — |

Classification order on import:

1. Provider registry match (narration aliases + UPI handle substrings, e.g. handle containing `rapido` → Rapido → `outing`)
2. User rules (people / overrides)
3. Amount-band heuristic for cigarettes
4. Otherwise uncategorized / other

Users can `POST /api/providers` with `upiHandles` + `categorySlug` for personal merchants.

---

## Table schema

Migrations: `backend/src/db/migrations/001_initial.up.sql`, `002_bank_mail_and_pooling.up.sql`.

```mermaid
erDiagram
  users ||--o{ accounts : owns
  users ||--o{ imports : owns
  users ||--o{ transactions : owns
  users ||--o{ user_rules : owns
  users ||--o{ providers : owns
  users ||--o| gmail_connections : has
  accounts ||--o{ imports : funds
  imports ||--o{ transactions : contains
  providers ||--o{ transactions : classifies
  categories ||--o{ providers : "slug ref"
  transactions ||--o| transaction_overrides : corrected_by

  users {
    uuid id PK
    text email UK
    text password_hash
    timestamptz deleted_at
  }

  accounts {
    uuid id PK
    uuid user_id FK
    text bank
    text label
    text_array statement_sender_emails
    boolean pooling_enabled
    timestamptz pooling_started_at
  }

  categories {
    uuid id PK
    uuid user_id FK
    text slug
    text label
    boolean is_global
  }

  providers {
    uuid id PK
    uuid user_id FK
    text canonical_name
    text_array aliases
    text_array upi_handles
    text category_slug
    boolean is_global
  }

  imports {
    uuid id PK
    uuid user_id FK
    uuid account_id FK
    text source
    text status
    text gmail_message_id
    text attachment_hash
  }

  transactions {
    uuid id PK
    uuid user_id FK
    date date
    numeric amount
    text type
    text upi_id
    uuid provider_id FK
    text category_slug
    text fingerprint UK
  }

  gmail_connections {
    uuid id PK
    uuid user_id UK
    text google_email
    text refresh_token_encrypted
    text history_id
    timestamptz last_sync_at
  }

  user_rules {
    uuid id PK
    uuid user_id FK
    text match_upi_id
    text set_payee_name
    text set_category_slug
  }
```

### Column notes

| Table | Purpose |
|-------|---------|
| **accounts.statement_sender_emails** | Allowlisted bank From: domains/addresses used in Gmail `q=`. Never used to store non-bank mail. |
| **accounts.pooling_enabled** | User opted into continuous bank-statement pooling. |
| **imports.attachment_hash** | SHA-256 of PDF bytes — dedupe uploads/Gmail. |
| **transactions.fingerprint** | Stable per-user unique key — skip duplicate rows on re-import. |
| **providers.upi_handles** | Substring match against parsed `upi_id` (e.g. `rapido`). |

---

## Pooling architecture

### Privacy stance

- OAuth scope is `gmail.readonly` (required by Google to list messages).
- **Search query is built only from the user’s bank sender allowlist** (`buildStatementQuery`).
- We persist statement **PDF attachments** and parsed **transactions**, not arbitrary mailbox content.
- Disconnecting Gmail clears the connection and turns pooling off.

### Enable pooling flow

```mermaid
sequenceDiagram
  participant U as User
  participant UI as Dashboard
  participant Acc as /api/accounts
  participant Gm as /api/gmail
  participant G as Google
  participant Imp as Import pipeline
  participant PG as Postgres

  U->>UI: Select bank + sender emails
  UI->>Acc: PATCH accounts
  Acc->>PG: statement_sender_emails
  U->>UI: Enable Pooling (month=2026-08)
  alt Gmail not connected
    UI->>Gm: GET connect
    Gm->>G: OAuth consent
    G-->>UI: callback
  end
  UI->>Gm: POST pooling/enable
  Gm->>PG: pooling_enabled=true
  Gm->>G: messages.list(q=from:bank + statement + pdf + after/before)
  G-->>Gm: message ids
  Gm->>Imp: processPdfImport per PDF
  Imp->>PG: imports + transactions
  Note over Gm: Hourly history poll keeps watching
```

### Query shape

```
(from:(hdfcbank.net OR hdfcbank.com OR alerts@hdfcbank)
 subject:(statement OR "account statement" OR e-statement)
 has:attachment filename:pdf)
 after:2026/08/01 before:2026/09/01
```

Senders come from `accounts.statement_sender_emails` (defaults from bank presets). No senders → pooling APIs return 400.

### Backfill vs poll

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Backfill** | Enable pooling / Run backfill | Bounded `messages.list` with allowlist query (+ optional month window) |
| **History poll** | Hourly job (`gmail/jobs.ts`) | `users.history.list` for connected accounts |
| **Push** | Pub/Sub (optional) | `/api/gmail/push` — token verification still beta debt |

### Dedupe

1. `UNIQUE (user_id, gmail_message_id)` on imports  
2. `UNIQUE (user_id, attachment_hash)` on imports  
3. `UNIQUE (user_id, fingerprint)` on transactions  

---

## Dashboard month mapping

- Default personal window: **August 2026** (`2026-08`).
- `GET /api/imports/dashboard?from=2026-08-01&to=2026-08-31` filters stored rows.
- **Top UPI handles** panel ranks debit targets by spend/count for that month.

---

## Personal-use setup checklist

1. `docker compose up -d postgres` (or full stack) — `DATABASE_URL=postgres://ledgerline:ledgerline@localhost:5432/ledgerline`
2. Backend: set `JWT_SECRET`, `ENCRYPTION_KEY`, optional `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / redirect URI
3. Run migrations on boot (`npm run migrate` or API start)
4. Register with invite code → open dashboard
5. **Bank mail & pooling**: pick bank (HDFC for PDF parse) → confirm sender emails → **Enable pooling** for `2026-08`
6. Or upload August statement PDF manually
7. Review Top UPI handles + lifestyle categories (Rapido under Outing)

---

## Key API surfaces

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/accounts/bank-presets` | Curated banks + default senders |
| GET/PATCH | `/api/accounts` | List / set bank + sender allowlist |
| POST | `/api/gmail/pooling/enable` | Flag + month-scoped bank-mail backfill |
| POST | `/api/gmail/pooling/disable` | Stop pooling flag |
| GET | `/api/imports/dashboard?from&to` | Month-filtered analytics |
| GET/POST | `/api/providers` | Provider registry under categories |

---

## Folder map (backend)

```
backend/src/
  accounts/     # Bank presets + account mail sources
  gmail/        # OAuth, query builder, pooling, jobs
  providers/    # Category ⊃ provider registry
  imports/      # PDF pipeline + dashboard
  adapters/     # Bank PDF parsers (HDFC today)
  db/           # Store, migrations, postgres/memory
```
