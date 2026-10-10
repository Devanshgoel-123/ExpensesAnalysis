# API Documentation

Complete API reference for Ledgerline backend.

**Base URL:** `http://localhost:4000` (development) or your production domain

---

## Authentication

All endpoints (except `/auth/*`) require a valid JWT token in the `Authorization` header:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:4000/api/imports/dashboard
```

JWT is obtained by signing up or logging in. Tokens expire after 7 days.

---

## Auth Endpoints

### Sign Up

**POST** `/api/auth/signup`

Create a new account.

```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure-password",
    "inviteCode": "beta-ledgerline"
  }'
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": null,
    "avatarUrl": null
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login

**POST** `/api/auth/login`

Authenticate with email and password.

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure-password"
  }'
```

**Response:** `200 OK`
```json
{
  "user": { "id": "...", "email": "..." },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Get Profile

**GET** `/api/auth/me`

Get current user profile.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "displayName": "John Doe",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

### Update Profile

**PATCH** `/api/auth/me`

Update user profile.

```bash
curl -X PATCH http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "New Name",
    "avatarUrl": "https://example.com/new-avatar.jpg"
  }'
```

**Response:** `200 OK` (updated user)

### Delete Account

**DELETE** `/api/auth/me`

Permanently delete account and all associated data.

**Response:** `204 No Content`

---

## Import Endpoints

### Get Dashboard

**GET** `/api/imports/dashboard?from=2026-10-01&to=2026-10-31`

Get spending overview for a date range.

**Query Parameters:**
- `from` (optional) — Start date (YYYY-MM-DD)
- `to` (optional) — End date (YYYY-MM-DD)

**Response:** `200 OK`
```json
{
  "summary": {
    "totalSpent": 15000,
    "totalReceived": 5000,
    "totalInvested": 2500,
    "avgDailySpend": 500,
    "transactionCount": 45,
    "upiPayees": 12,
    "dateFrom": "2026-10-01",
    "dateTo": "2026-10-31"
  },
  "transactions": [
    {
      "id": "uuid",
      "date": "2026-10-15",
      "amount": 450,
      "type": "debit",
      "merchant": "Swiggy",
      "description": "Swiggy",
      "category": "food",
      "myShare": null
    }
  ],
  "categories": [
    {
      "slug": "food",
      "label": "Food & Dining",
      "accent": "#FF6B6B"
    }
  ],
  "daily": [
    {
      "date": "2026-10-15",
      "amount": 1200
    }
  ],
  "daily Insights": {
    "enabled": true,
    "limit": 1500,
    "daysOverLimit": ["2026-10-15"],
    "worstDay": { "date": "2026-10-15", "amount": 2000 }
  }
}
```

### Get Import Status

**GET** `/api/imports/status`

Check import history and data status.

**Response:** `200 OK`
```json
{
  "hasTransactions": true,
  "importCount": 3,
  "lastImportDate": "2026-10-10T14:30:00Z",
  "transactionCount": 127
}
```

### Get Imports

**GET** `/api/imports`

List all imports (PDFs and Gmail sessions).

**Response:** `200 OK`
```json
{
  "imports": [
    {
      "id": "uuid",
      "source": "pdf",
      "filename": "HDFC_Oct_2026.pdf",
      "createdAt": "2026-10-10T14:30:00Z",
      "insertedCount": 42,
      "skippedCount": 5
    }
  ]
}
```

### Upload PDF

**POST** `/api/imports/upload`

Upload HDFC bank statement PDF.

**Form Data:**
- `file` (required) — PDF file
- `password` (optional) — PDF password

```bash
curl -X POST http://localhost:4000/api/imports/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@statement.pdf" \
  -F "password=pdf-password"
```

**Response:** `200 OK`
```json
{
  "insertedCount": 42,
  "skippedCount": 5,
  "isDuplicate": false,
  "previousImportDate": null,
  "errors": []
}
```

### Clear All Data

**DELETE** `/api/imports/data`

Clear all imported transactions and Gmail sessions.

**Response:** `200 OK`
```json
{
  "cleared": true,
  "deletedTransactionCount": 127,
  "deletedImportsCount": 3
}
```

---

## Transaction Endpoints

### Create Manual Expense

**POST** `/api/imports/transactions`

Add a manual expense transaction.

```bash
curl -X POST http://localhost:4000/api/imports/transactions \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-10-15",
    "amount": 500,
    "categorySlug": "food",
    "description": "Lunch at restaurant"
  }'
```

**Validation:**
- `amount` — ₹0.01 to ₹999,999
- `date` — No future dates
- `description` — 3-200 chars, alphanumeric + spaces/hyphens/slashes/commas/ampersand
- `categorySlug` — Must exist

**Response:** `200 OK`
```json
{
  "transaction": {
    "id": "uuid",
    "date": "2026-10-15",
    "amount": 500,
    "type": "debit",
    "description": "Lunch at restaurant",
    "category": "food",
    "myShare": null
  }
}
```

### Correct Transaction

**PATCH** `/api/imports/transactions/:id`

Update transaction details.

```bash
curl -X PATCH http://localhost:4000/api/imports/transactions/uuid \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "categorySlug": "restaurants",
    "merchant": "Biryani House",
    "payee": "John Doe",
    "applyFuture": false
  }'
```

**Parameters:**
- `categorySlug` (optional) — New category
- `merchant` (optional) — Merchant name
- `payee` (optional) — Person name (for splits)
- `applyFuture` (optional) — Apply to similar future transactions

**Response:** `200 OK`
```json
{
  "transaction": { ... },
  "reclassified": 5
}
```

### Delete Transaction

**DELETE** `/api/imports/transactions/:id`

Remove transaction.

```bash
curl -X DELETE http://localhost:4000/api/imports/transactions/uuid \
  -H "Authorization: Bearer TOKEN"
```

**Response:** `200 OK`
```json
{
  "deleted": true
}
```

### Set Bill Split

**PUT** `/api/imports/transactions/:id/splits`

Split bill among friends.

```bash
curl -X PUT http://localhost:4000/api/imports/transactions/uuid/splits \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "friends": [
      { "name": "Alice", "amount": 250 },
      { "name": "Bob", "amount": 250 }
    ]
  }'
```

**Response:** `200 OK`
```json
{
  "transaction": {
    "id": "uuid",
    "amount": 500,
    "myShare": 0,
    "splits": [
      { "name": "Alice", "amount": 250 },
      { "name": "Bob", "amount": 250 }
    ]
  }
}
```

---

## Category Endpoints

### List Categories

**GET** `/api/categories`

Get all spending categories.

**Response:** `200 OK`
```json
[
  {
    "slug": "food",
    "label": "Food & Dining",
    "accent": "#FF6B6B",
    "icon": "utensils",
    "meta": {
      "parent": null
    }
  }
]
```

### Create Category

**POST** `/api/categories`

Create custom category.

```bash
curl -X POST http://localhost:4000/api/categories \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Travel",
    "accent": "#4ECDC4",
    "icon": "plane"
  }'
```

**Response:** `200 OK` (created category)

---

## Demo Endpoints

### Load Demo Data

**POST** `/api/demo/load`

Load sample transactions for exploration.

```bash
curl -X POST http://localhost:4000/api/demo/load \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response:** `200 OK`
```json
{
  "created": 19
}
```

Loads 19 sample transactions across categories (Food, Shopping, Travel, Investments, etc.).

---

## Health Endpoints

### Liveness

**GET** `/health` or `/live`

Check if API is running.

**Response:** `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2026-10-10T14:30:00Z"
}
```

### Readiness

**GET** `/ready`

Check if API is ready to serve traffic (database connected, migrations done).

**Response:** `200 OK` (if ready) or `503` (if not ready)

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "requestId": "unique-request-id",
    "details": { }
  },
  "detail": "Additional context"
}
```

### Common Errors

| Status | Code | Reason |
|--------|------|--------|
| 400 | `BAD_REQUEST` | Invalid input (validation failed) |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Token valid but insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Duplicate import or constraint violation |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

### Rate Limiting

Requests return `429 Too Many Requests` when limits exceeded:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many modifications. Please wait before making more changes.",
    "details": {
      "retryAfterSeconds": 60
    }
  }
}
```

**Limits:**
- Upload: 15 per minute per user
- Mutations (DELETE/PATCH): 30 per minute per user
- Global: 100 per minute per IP

---

## Client SDK (TypeScript)

### Setup

```typescript
import { createApiClient } from "@/lib/api/client";

const client = createApiClient(jwtToken);
```

### Usage Examples

```typescript
// Get dashboard data
const dashboard = await client.fetchDashboard({ from: "2026-10-01", to: "2026-10-31" });

// Upload PDF
const result = await client.uploadPdf(pdfFile, password);

// Create expense
const txn = await client.createManualExpense({
  date: "2026-10-15",
  amount: 500,
  categorySlug: "food",
  description: "Lunch"
});

// Correct transaction
const updated = await client.correctTransaction(txnId, {
  categorySlug: "restaurants"
});

// Split bill
await client.setBillSplit(txnId, [
  { name: "Alice", amount: 250 },
  { name: "Bob", amount: 250 }
]);

// Load demo
await client.loadDemoData();
```

---

## Webhooks (Future)

Webhooks for transaction events will be supported in future releases. Subscribe to [GitHub Issues](https://github.com/Devanshgoel-123/ExpensesAnalysis/issues) for updates.

---

## Rate Limiting

All endpoints are rate-limited to prevent abuse:

- **Auth endpoints:** 5 per minute per IP (brute-force protection)
- **Upload:** 15 per minute per user
- **Mutations:** 30 per minute per user
- **Global:** 100 per minute per IP

Headers returned:
```
RateLimit-Limit: 100
RateLimit-Remaining: 87
RateLimit-Reset: 1634000000
```

---

## Pagination (Future)

Large result sets will support pagination in future releases:

```
GET /api/transactions?page=1&limit=50
```

---

## Changelog

### v1.0 (Current)
- Auth (signup, login, profile)
- PDF import & parsing
- Manual expenses
- Bill splitting
- Categories & rules
- Demo data
- Health checks

### v1.1 (Planned)
- Transaction search & filtering
- Advanced analytics
- Webhooks
- Pagination
- Export (CSV, JSON)

---

## Support

- **Issues:** [GitHub Issues](https://github.com/Devanshgoel-123/ExpensesAnalysis/issues)
- **Security:** [SECURITY.md](../SECURITY.md)
- **Questions:** See [CONTRIBUTING.md](../CONTRIBUTING.md#need-help)
