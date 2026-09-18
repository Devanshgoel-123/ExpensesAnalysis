# Gmail pooling — current flow

This is how bank-mail ingest works **today**. It is a map of the running system, not a target design.

Two different jobs share the word “pooling”:

1. **Query scan (backfill)** — search Gmail with `from:` + keywords + `after:YYYY/MM/DD`, then fetch each hit.
2. **History poll** — ask Gmail “what is new since `historyId`?”, then fetch those IDs. No search query.

They write the same tables. They do **not** share a queue. They **do** share a DB row lock (`pooling_runs.status = running`).

---

## Processes

```text
Browser (localhost:3000)
    │  JWT
    ▼
API  (localhost:4000)          Worker (127.0.0.1:5473)
    │                               │
    │  enable / backfill / sync     │  every ~2 min (dev) or hourly (inline jobs)
    │  run the work IN-PROCESS      │  history poll only on the timer
    │                               │
    └────────── Postgres ───────────┘
                    │
                    ▼
              Gmail API
```

| Process | Started by | What it does |
|---|---|---|
| **API** `npm run dev` | You / UI | HTTP for the app. Enable, Backfill, Sync Now all run Gmail work **inside this process**, then return JSON. |
| **Worker** `npm run dev:worker` | You | Separate Node process. Timer ticks **history polls**. Also has ops HTTP: `POST /probe`, `POST /backfill`, `POST /run`. |

Today, inline API jobs are usually **off** (`DISABLE_INLINE_GMAIL_JOBS` / `POOLING_WORKER_SEPARATE`). So:

- The **UI never talks to port 5473**.
- The worker timer does **not** run a query backfill. It only does incremental history polls.
- Clicking Backfill in the app hits `POST /api/gmail/backfill` on **:4000**, not the worker.

If the API is down, Enable / Backfill look like “nothing happened”.

---

## Data the system keeps

```text
users
  └── accounts                    bank + sender allowlist + pooling_enabled
  └── gmail_connections           refresh token, historyId, lastSyncAt
  └── pooling_runs                one row per attempt (running → completed | failed)
  └── mail_messages               parsed alert metadata (no body stored)
  └── imports + transactions      what the dashboard reads
```

**Sender allowlist example (HDFC):** `hdfcbank.net`, `hdfcbank.com`, `alerts@hdfcbank.net`.

Search never walks the whole mailbox. Gmail `q` is always `from:(those senders) …`.

**Floor:** nothing before **1 Jan 2026, 00:00 IST** is queried or stored. The Gmail operator is exclusive on that calendar day, so the query uses `after:2025/12/31`. Anything earlier that still slips through is dropped when the message date is checked.

---

## The two engines

### A. Query scan — “find old and current bank mail”

Used by: **Enable pooling**, **Backfill**, worker `POST /backfill`.

```text
1. Build alert query
   from:(hdfcbank.net OR hdfcbank.com OR alerts@hdfcbank.net)
   (debited OR credited OR UPI OR InstaAlerts OR …)
   after:2025/12/31

2. Gmail messages.list  →  pages of 25 IDs  (cap: 500 UI / 2000 worker default)

3. For each ID:
     messages.get
     skip if before cutoff
     skip if it looks like a statement PDF mail
     parse subject+body in memory
     if amount+type parsed → insert transaction (deduped by fingerprint)
     else store mail_messages row only (“stored”, counted as skipped in the UI)

4. Then a smaller statement query (PDF attachments) — secondary, often 0 hits
```

**Example — one HDFC InstaAlert**

```text
Gmail ID  19d68961571150b6
From      HDFC Bank InstaAlerts <alerts@hdfcbank.net>
Subject   You have done a UPI txn. Check details!
Received  2026-04-07

→ parse amount ₹240, type debit
→ classify (food / merchant / …)
→ transactions row
→ dashboard Overview shows it after refresh
```

**Example — marketing mail from the same domain**

```text
From      HDFC Bank <feedback@hdfcbank.net>
Subject   Feedback on your experience with HDFC Bank

→ list() still returns it (sender matches)
→ parser finds no amount
→ mail_messages stored, no transaction
→ counted as skipped
```

### B. History poll — “only what arrived since last time”

Used by: worker timer, **Sync now**, optional Gmail Pub/Sub push.

```text
1. Read gmail_connections.historyId  (e.g. 4620081)
2. Gmail users.history.list(startHistoryId)
3. If Gmail says “0 new messages” → scanned = 0, import = 0
4. If there are new IDs → same per-message path as above (alert first, else PDF)
5. Save the new historyId
```

**Example — why Sync now often changes nothing**

```text
Last historyId   4620081   saved at 17:50
You click Sync   17:51
Gmail history    0 added messages

UI: “scanned 0, imported 0”
Pooling is still Active. The mailbox just had no *new* mail since the cursor.
Old April UPI alerts are invisible to history. Only a query scan can see them.
```

That is the most common confusion: **poll ≠ backfill**.

---

## User-facing flows

### 1. First-time setup

```text
Import page
  pick bank (HDFC) + senders
  Save bank setup          →  PATCH /api/accounts
  Enable pooling           →  PATCH /api/accounts again
                           →  if Gmail not connected: redirect to Google
                           →  POST /api/gmail/pooling/enable
                                sets pooling_enabled = true
                                then runs a full query scan (engine A)
                                waits until that scan finishes
                                returns { alerts, statements, backfill }
  UI flips “Pooling: Active”
  if Gmail matched 0 mail → error copy, not a silent success
```

**Example happy path**

```text
Enable
  PATCH bank=HDFC senders=[hdfcbank.net, …]     200
  POST  /api/gmail/pooling/enable               200 after ~2–8 min
        alerts:     scanned 201  imported 145  skipped 56
        statements: scanned 0    imported 0
  Overview refresh → April UPI spend appears
```

**Example failure that used to look like a no-op**

```text
Enable while <select> still has bank=""
  PATCH /api/accounts                           400  bank too short
  enable never runs
  monitor still says Off
```

### 2. Backfill button (Overview or Import)

```text
POST /api/gmail/backfill   { maxMessages: 500 }
  → same engine A as Enable
  → does NOT require pooling_enabled on the server
  → UI used to hide the button unless pooling was on
```

This is the only UI path that can ingest mail older than `historyId`.

### 3. Sync now

```text
POST /api/gmail/sync
  → engine B (history poll)
  → requires pooling_enabled
  → will not re-scan April mail
```

### 4. Worker timer (background)

```text
every POOLING_WORKER_INTERVAL_MS  (dev: 120000 = 2 min)
  list accounts where pooling_enabled = true
  if a pooling_run is still "running" for that user → skip
  else engine B (history poll)
```

**Example log line you will see forever after a successful backfill**

```text
gmail history — 0 new messages since last historyId
pooling poll ✓ — 0 mail(s), +0 imported
```

That means the cursor is caught up, not that pooling is broken.

---

## Locks (why clicks feel dead)

Two locks, different lifetimes:

```text
Worker memory:   pollInFlight
  one tick or worker-backfill at a time
  POST /backfill on :5473 returns { error: "busy" } if set
  does not block the API

Postgres:        pooling_runs.status = 'running'
  dispatcher skips the user (“run_already_in_progress”)
  Enable/Backfill on the API now mark stale/any running row failed
    (“Replaced by a new scan”) then start a new run
  counters on the row stay 0 until finishRun — the monitor can show
  “running · 0 mail” even while logs say “+145 imported”
```

**Example — long backfill vs timer**

```text
17:52  UI/API or worker POST /backfill starts run d38fb343 (status=running)
17:54  timer tick → skip, run_already_in_progress
18:00  logs: 200 scanned, 145 imported  (DB row still scanned=0)
18:xx  finishRun → completed, scanned=201, imported=…
       next timer tick is allowed
```

A history poll that hangs also leaves `running` behind. After 10 minutes the dispatcher treats it as stale. Enable/Backfill do not wait — they replace it.

---

## Gmail watch / push (optional, usually unused)

```text
Connect Gmail → try users.watch (needs GMAIL_PUBSUB_TOPIC)
Google → POST /api/gmail/push  { emailAddress, historyId }
       → engine B for that user
```

If the Pub/Sub topic is empty, watch is skipped. Incremental mail then depends entirely on the worker timer + Sync now.

---

## API cheat sheet

| Who | Request | Engine | Waits for Gmail? |
|---|---|---|---|
| Import → Enable pooling | `POST /api/gmail/pooling/enable` | A query scan | Yes (can take minutes) |
| Backfill button | `POST /api/gmail/backfill` | A query scan | Yes |
| Sync now | `POST /api/gmail/sync` | B history | Usually seconds |
| Disable | `POST /api/gmail/pooling/disable` | — | No |
| Status / monitor | `GET /api/gmail/status` | — | No |
| Ops | `POST :5473/probe` | list only, no import | Seconds |
| Ops | `POST :5473/backfill` | A for every enabled account | Minutes |
| Ops | `POST :5473/run` | B for every enabled account | Seconds–minutes |

---

## One mailbox, two questions

Use this when debugging “it imported nothing”:

```text
Q1. Does Gmail search see the mail at all?
    POST :5473/probe
    alert estimate > 0  → senders + after: date are fine
    alert estimate = 0  → wrong senders, wrong cutoff, or wrong inbox

Q2. Is this a poll or a scan?
    Sync now / worker tick     → only mail newer than historyId
    Enable / Backfill          → search from the cutoff date
```

**Worked example (this project’s connected inbox)**

```text
from:hdfcbank.net                         → ~201 messages exist
from:hdfcbank.net after:2026/07/26        → 0   (newest UPI alerts are Apr 2026)
from:hdfcbank.net after:2025/12/31        → ~201
history since historyId 4620081           → 0 new

So: poll stays at 0. Only a query scan from 1 Jan 2026 imports those alerts.
```

---

## What the Import monitor is showing

```text
Dispatcher   idle | pending | running | ok | degraded
Pooling      Off  | Active          ← accounts.pooling_enabled
Last sync    gmail_connections.lastSyncAt
Latest run   newest pooling_runs row (status, scanned, imported, trigger)
```

`trigger` tells you which path wrote the row: `enable`, `backfill`, `manual_sync`, `dispatcher`, `push`.

`mode` is `backfill` (engine A) or `poll` (engine B).
