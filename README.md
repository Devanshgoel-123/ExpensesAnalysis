# Ledgerline — UPI Expense Dashboard

Parse password-protected bank / UPI statement PDFs and explore spending in a dark dashboard.

## Stack

- `frontend/` — Next.js (TypeScript) dashboard
- `backend/` — Express (TypeScript) PDF parser API

## Setup

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

## Usage

1. Export a bank / UPI statement PDF (often password-protected with DOB, phone, or PAN).
2. Upload it on the landing page and enter the password.
3. View daily spend, UPI payee ranking, and transaction list.

## API

`POST /api/parse` — multipart form with `file` (PDF) and optional `password`.
