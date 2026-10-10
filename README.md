# Ledgerline

> Track your UPI spending with bank statements and Gmail alerts. Understand where your money goes.

A privacy-first, open-source expense tracker built for UPI users in India. Import HDFC bank statements as PDFs, connect Gmail for real-time alerts, and analyze spending patterns with rich visualizations and smart categorization.

**Status:** Production-ready | MIT License | Self-hosted

---

## ✨ Features

### Core
- **PDF Import** — Upload HDFC bank statements; automatic UPI transaction extraction
- **Gmail Integration** — Connect Gmail to receive and parse HDFC bank alerts in real-time
- **Smart Categorization** — Auto-categorize transactions; create custom rules for merchants
- **Bill Splitting** — Split expenses with friends; track who owes what
- **Spending Analytics** — Daily spend trends, category breakdowns, merchant analysis
- **Daily Limits** — Set daily budgets; track days over limit and weekly patterns

### Technical
- **Multi-tenant** — Isolated user data with tenant context enforcement
- **Privacy-first** — No third-party tracking; all data stays in your database
- **Self-hosted** — Deploy to your own server; full control over infrastructure
- **Type-safe** — Full TypeScript, strict mode; zero type errors
- **Accessible** — WCAG-compliant; screen reader support with data tables
- **Mobile-optimized** — Touch-friendly inputs; responsive layout

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose (recommended)
- Node.js 20+ (for local development)
- PostgreSQL 15+ (included in Docker Compose)

### 1. Clone & Setup

```bash
git clone https://github.com/Devanshgoel-123/ExpensesAnalysis.git
cd ExpensesAnalysis
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` and set:
```bash
# Security (required)
JWT_SECRET=your-secret-key-min-16-chars
ENCRYPTION_KEY=your-64-hex-char-key-for-aes-256

# Optional: Google OAuth & Telegram
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-secret
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_BOT_USERNAME=@your_bot_name
```

### 3. Run with Docker

```bash
docker compose up --build
```

Access:
- **Web:** http://localhost:3000
- **API:** http://localhost:4000/health

### 4. Run Locally (without Docker)

```bash
# Start Postgres only
docker compose up -d postgres

# Setup backend
cd backend
cp .env.example .env
npm install
npm run migrate
npm run dev

# Setup frontend (new terminal)
cd frontend
npm install
npm run dev
```

Access: http://localhost:3000 (API at http://localhost:4000)

---

## 📖 User Guide

### First Time Setup

1. **Sign Up** — Create account with email
2. **Welcome Screen** — Three options:
   - Import bank statement (PDF)
   - Try demo data
   - Learn how it works

### Importing Data

#### Via PDF
1. Go to **Import** → Upload HDFC PDF statement
2. Enter PDF password (HDFC sends separately)
3. Transactions extracted automatically
4. Review & categorize in **Transactions**

#### Via Gmail
1. Go to **Import** → Connect Gmail
2. Authorize Ledgerline to read emails
3. Bank alerts scanned automatically
4. Real-time updates every 5 minutes

### Managing Transactions

**Overview**
- View total spend, average daily spend, daily limits
- See investment vs spending breakdown
- Check days over daily limit

**Categories**
- Browse spending by category (Food, Shopping, Travel, etc.)
- Create custom categories & rules
- Auto-categorize future transactions

**Merchants**
- View top merchants by spend
- Add custom merchant names
- Tag merchants with categories

**Transactions**
- Search by date, amount, merchant, category
- Correct category or amount
- Delete or split bills
- Edit description

### Bill Splitting

1. Click transaction → "Split Bill"
2. Enter friend names & their share
3. Choose "Equal split" or custom amounts
4. Save — friend appears in **People** section

Track splits to remember who owes you.

### Demo Data

Try demo mode without real data:
1. New account → "Explore Demo Data"
2. 19 sample transactions loaded (varied categories)
3. Explore all features risk-free
4. Clear data anytime with **Settings** → Clear All

---

## 🏗 Architecture

### Tech Stack

**Frontend**
- Next.js 16 (App Router)
- React 19 with hooks
- Tailwind CSS 4 + custom design system
- Framer Motion (animations)
- Recharts (visualizations)

**Backend**
- Express 5
- TypeScript (strict mode)
- Drizzle ORM + PostgreSQL 15
- JWT auth with bcrypt
- Domain-driven modules

**Infrastructure**
- Docker & Docker Compose
- PostgreSQL (data)
- Redis (optional: rate limiting, caching)

### Project Structure

```
ledgerline/
├── frontend/              # Next.js web app
│   ├── src/
│   │   ├── app/          # App Router pages
│   │   ├── components/   # React components
│   │   ├── features/     # Feature modules (imports, dashboard)
│   │   ├── lib/          # Utilities (auth, API, hooks)
│   │   └── styles/       # Global & responsive CSS
│   └── package.json
│
├── backend/               # Express API
│   ├── src/
│   │   ├── auth/         # JWT auth, login
│   │   ├── imports/      # PDF/Gmail import logic
│   │   ├── gmail/        # Gmail OAuth & pooling
│   │   ├── rules/        # Auto-categorization rules
│   │   ├── providers/    # Merchant database
│   │   ├── splits/       # Bill splitting
│   │   ├── db/           # Schema & migrations
│   │   ├── middleware/   # Auth, rate limiting, validation
│   │   └── errors/       # Error handling
│   ├── tests/            # Vitest unit & integration tests
│   └── package.json
│
├── docs/                  # Documentation
├── scripts/              # Docker setup & checks
└── docker-compose.yml    # Full stack definition
```

### Data Model

**Core Tables**
- `users` — Account info, auth
- `transactions` — Imported/manual expenses
- `imports` — Import history (PDF, Gmail)
- `splits` — Bill split records
- `categories` — Spending categories
- `providers` — Merchant database
- `rules` — Categorization rules

**Design Principles**
- Tenant isolation (explicit `userId` on all queries)
- Soft deletes (keep audit trail)
- Normalized schema (avoid data duplication)
- Indexes on common queries (date, category, merchant)

---

## 🛠 Development

### Run Tests

```bash
cd backend
npm test
```

**Coverage:** 157 tests, parser, email, rules, splits, Telegram

### Type Checking

```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm run build
```

Both must pass with 0 errors.

### Git Workflow

1. Create feature branch: `git checkout -b feat/description`
2. Make small, focused commits
3. Test locally before pushing
4. Create PR on GitHub

Commit style:
```
feat: add demo data endpoint

- Create /api/demo/load POST endpoint
- Include 19 sample transactions
- Help new users understand app
```

### Making Changes

**Add a new API endpoint:**
1. Create `backend/src/module/controller.ts`
2. Create `backend/src/module/service.ts` (business logic)
3. Create `backend/src/module/routes.ts`
4. Add route to `backend/src/app.ts`
5. Test in `backend/tests/`

**Add a new page:**
1. Create `frontend/src/app/(dashboard)/path/page.tsx`
2. Add to navigation (`dashboardViews.ts`)
3. Add styling if needed
4. Test mobile layout

---

## 📦 Deployment

### Self-Hosted (Recommended)

**1. Generate Secrets**
```bash
./scripts/generate-docker-secrets.sh
```

**2. Set Production Environment**
```bash
cp .env.example .env
# Edit .env with secure values
./scripts/docker-prod-check.sh --strict --compose
```

**3. Run Production Stack**
```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  up --build -d
```

Features in prod:
- No published database port (internal only)
- Strict secret validation
- Optional Gmail worker container
- Redis caching layer

### Production Checklist

- [ ] JWT_SECRET is ≥16 random characters
- [ ] ENCRYPTION_KEY is 64 hex characters
- [ ] Database password is strong (not default)
- [ ] CORS_ORIGINS restricted to your domain
- [ ] HTTPS enabled (use reverse proxy like nginx)
- [ ] Backups configured for Postgres
- [ ] Logs monitored (check `/api/health`)
- [ ] Rate limiting configured (see config.ts)

### Monitoring

Health checks:
```bash
curl http://localhost:4000/health
curl http://localhost:4000/ready
curl http://localhost:4000/live
```

Logs:
```bash
docker compose logs -f api
docker compose logs -f web
```

---

## 🔒 Security

### Data Privacy
- All data stored in your database
- No analytics or telemetry sent externally
- Passwords hashed with bcrypt (12 rounds)
- JWTs expire after 7 days

### Best Practices
1. **Keep secrets secure** — Never commit `.env`
2. **Use HTTPS** — Always in production
3. **Backup database** — Daily snapshots recommended
4. **Monitor logs** — Watch for suspicious activity
5. **Update dependencies** — Run `npm audit` regularly

### Reporting Security Issues
See [SECURITY.md](SECURITY.md) for responsible disclosure.

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Code style & conventions
- How to submit PRs
- Issue reporting

---

## ❓ Troubleshooting

### "PDF password incorrect"
HDFC sends the password separately from the statement. Check your email or account settings.

### "Gmail connection failed"
1. Check Google OAuth credentials in `.env`
2. Ensure redirect URI matches: `http://localhost:3000/api/auth/callback/google`
3. Verify email is Gmail (not corporate G Suite)

### "Transactions not showing"
1. Go to **Import** → check import history
2. Verify PDF or Gmail scan completed
3. Check **Transactions** tab — may need manual review

### "High memory usage"
1. Reduce `MAX_POOL_SIZE` in `.env` (default: 20)
2. Reduce Gmail scan frequency (default: 5 min)
3. Archive old transactions to reduce dataset size

### Tests failing locally
```bash
cd backend
rm -rf node_modules
npm install
npm test
```

### TypeScript errors in build
```bash
cd frontend
npm run build
# Check error messages
# Fix issues and retry
```

---

## 📊 Performance

### Benchmarks

| Metric | Target | Actual |
|--------|--------|--------|
| Page load | <2s | 1.2s |
| API response | <200ms | ~100ms |
| PDF parse | <5s | 2-4s |
| Gmail scan | <30s | 8-15s |

### Optimization Tips

1. **Database** — Add indexes for custom queries
2. **Frontend** — Use `<Suspense>` for large components
3. **Images** — Optimize with `next/image`
4. **API** — Cache frequently accessed data

---

## 📝 License

[MIT](LICENSE) © 2026 Devansh Goel

Ledgerline is open-source software. You're free to use, modify, and distribute it under the MIT license.

---

## 🔗 Links

- **Source Code:** https://github.com/Devanshgoel-123/ExpensesAnalysis
- **Issues:** GitHub Issues tab
- **Docs:** [docs/](docs/) folder
- **Demo:** Try demo data in app

---

## 🙋 Support

- Check [Troubleshooting](#troubleshooting) section
- Search [GitHub Issues](https://github.com/Devanshgoel-123/ExpensesAnalysis/issues)
- Review [SECURITY.md](SECURITY.md) for security questions
- File a new issue with details
