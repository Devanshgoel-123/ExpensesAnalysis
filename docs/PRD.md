# Ledgerline — Product Requirements Document (Review Draft)

**Version:** 0.1 (private beta)  
**Last updated:** August 2026  
**Purpose:** Brief PRD for external review (e.g. GPT product critique). Describes what Ledgerline is, who it’s for, what ships today, and what’s intentionally out of scope.

---

## 1. One-liner

**Ledgerline** is a personal UPI expense dashboard that turns HDFC-style bank statement PDFs (upload or Gmail) into classified spends, lifestyle analytics, and daily budget insights — without building a full accounting product.

---

## 2. Problem

Indian users receive dozens of UPI debits monthly. Bank PDFs and email statements contain the truth, but:

- Raw narrations (`UPI-SWIGGY-swiggy@ybl-…`) are unreadable at a glance.
- Generic expense apps require manual categorization or SMS scraping.
- Users want **lifestyle answers** (“how much on food vs rides?”) and **habit signals** (small recurring spends, daily overshoots), not double-entry bookkeeping.

**Gap:** No lightweight tool that (a) respects bank PDF/email as source of truth, (b) auto-tags known Indian merchants, and (c) stays privacy-conscious about Gmail access.

---

## 3. Target user

| Attribute | Detail |
|-----------|--------|
| **Primary** | Single power user / founder dogfooding (private beta) |
| **Profile** | UPI-heavy spender, HDFC (or similar) e-statements, Gmail for bank mail |
| **Job to be done** | “After I import August, show me where money went, who I paid, and which days I blew my budget.” |
| **Not for (v0)** | Families, accountants, multi-bank enterprises, real-time payment sync |

---

## 4. Product principles

1. **Statement-first** — PDF/email ingestion beats live UPI hooks for v0.
2. **Privacy-scoped Gmail** — `gmail.readonly` only; search queries built from user-configured bank sender allowlist, never full inbox scrape.
3. **Classification > manual entry** — Provider registry + rules + amount heuristics before asking the user to tag rows.
4. **Month-scoped clarity** — Dashboard defaults to a calendar month; all panels respect `from` / `to`.
5. **Personal, not social** — No leaderboards, no sharing; invite-only access.

---

## 5. Core user flows (shipped)

### 5.1 Onboarding & auth
- Google OAuth sign-in (profile + Gmail read-only in one consent).
- JWT session (~7 days), stored client-side.
- Invite codes in DB for registration gating (legacy password path exists in backend; UI is Google-first).

### 5.2 Import data
- **Manual:** Upload password-protected PDF → HDFC parser → dedupe by fingerprint → persist.
- **Gmail pooling:** User picks bank preset → confirms sender emails → enables pooling → backfill for selected month.
- Re-import skips duplicates (`user_id + fingerprint`, `attachment_hash`, `gmail_message_id`).

### 5.3 Understand spends (dashboard)
Sidebar navigation with modular views:

| View | User outcome |
|------|----------------|
| **Overview** | Total spent, avg/day, daily bar chart, top UPI preview |
| **Daily limit** | User sets ₹ cap; see over-budget days, worst day, total overshoot |
| **Lifestyle** | Category breakdown (food, outing, travel, …) + per-merchant totals with logos |
| **People** | Payees tracked via user rules |
| **UPI handles** | Ranked by spend for the month |
| **Habits** | ₹25–60 debit band (cigarette heuristic) + heatmap days |
| **Transactions** | Full table with category correction |
| **Import** | Upload + bank mail pooling controls |
| **Settings** | Daily limit, Gmail, tracking rules, account delete |

### 5.4 Customize classification
- **Rules:** Match narration/UPI → set payee name or category; optional apply-future on transaction correction.
- **Providers:** Global catalog (Swiggy, Rapido, Zepto, …) + user-defined merchants; admin can set `logo_url` on global providers.

---

## 6. Classification model

**Order of precedence:**
1. Provider registry (UPI handle substring + aliases)
2. User rules
3. Amount-band heuristic (₹25–60 → cigarettes category meta)
4. Fallback → `other`

**Categories (global):** food, shopping, travel, outing, investments, cigarettes, other.

---

## 7. Technical snapshot (for reviewers)

| Layer | Stack |
|-------|--------|
| Frontend | Next.js 16, React 19, Tailwind 4, sidebar shell |
| Backend | Express 5, TypeScript, Zod validation |
| DB | PostgreSQL 16, versioned SQL migrations |
| Auth | Google OAuth + JWT; bcrypt for legacy users |
| Gmail | OAuth readonly, allowlist-built `messages.list`, PDF attachment extract |
| Tests | Backend unit/smoke tests; frontend Vitest component tests |

**Not production-hardened yet:** multi-instance rate limits, Redis, async import queue, CI against Postgres, SBI/ICICI PDF adapters.

---

## 8. Success metrics (beta)

| Metric | Target signal |
|--------|----------------|
| **Time to insight** | < 2 min from PDF upload to categorized dashboard |
| **Classification coverage** | ≥ 70% of debit rows tagged to a provider or category without manual edit |
| **Repeat use** | User imports ≥ 2 distinct months |
| **Trust** | User completes Gmail connect and runs one successful backfill |
| **Budget utility** | User sets daily limit and views ≥ 1 over-budget day |

---

## 9. Known limitations (honest scope)

- **One bank parser shipped:** HDFC PDF layout; other banks are sender allowlist only.
- **No mobile app** — responsive web only.
- **No real-time UPI** — batch statement model.
- **Single-user tenancy** — architecture supports multi-user DB, but UX is solo.
- **Gmail scope sensitivity** — even scoped readonly is a conversion friction point; mitigated by allowlist messaging and sign-in copy.

---

## 10. Roadmap (not built — for review context)

**Near term**
- SBI / ICICI PDF adapters
- Postgres integration tests in CI
- Onboarding empty state → guided first import

**Medium term**
- SMS / account aggregator (AA) as optional second source
- Shared household view (read-only link)
- Budget targets per category, not just daily cap

**Explicit non-goals**
- Lending, investments advice, tax filing
- Merchant payments / bill pay
- Social feeds or “compare with friends”

---

## 11. Review prompts for GPT

Use this PRD to evaluate Ledgerline on:

1. **Problem–solution fit** — Is statement-first ingestion the right wedge for Indian UPI users vs SMS/AA apps?
2. **Privacy narrative** — Is bank-sender allowlist + gmail.readonly credible enough for sign-up conversion?
3. **Differentiation** — What’s defensible vs Walnut, Jupiter insights, or manual Sheets?
4. **UX completeness** — Which shipped view is weakest for the stated job-to-be-done?
5. **Classification depth** — Is provider + rules + amount-band sufficient before ML?
6. **Monetization paths** — What would a solo user pay for (if anything) without violating trust?
7. **Technical risk** — Top 3 engineering debts that block 1k → 100k users.
8. **Positioning** — Is “lifestyle UPI dashboard” clear, or should messaging emphasize habits/budgets/merchants?

---

## 12. Appendix — key API surfaces

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/auth/google` | Start Google OAuth |
| GET | `/api/auth/me` | Current user + `dailySpendLimit` |
| GET/PATCH | `/api/preferences` | Daily spend cap |
| POST | `/api/parse` | Upload PDF |
| GET | `/api/imports/dashboard?from&to` | Month analytics |
| GET/POST | `/api/rules` | Tracking rules |
| GET/PATCH | `/api/accounts` | Bank + sender allowlist |
| POST | `/api/gmail/pooling/enable` | Gmail backfill |
| PATCH | `/api/admin/providers/:id` | Admin provider logos |

Full schema: [ARCHITECTURE.md](./ARCHITECTURE.md)
