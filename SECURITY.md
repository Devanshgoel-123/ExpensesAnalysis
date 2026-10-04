# Security

Ledgerline reads bank mail and stores a ledger. Do not open issues, pull requests, or chats that contain secrets or financial records.

## Never commit

- `.env` files, `JWT_SECRET`, `ENCRYPTION_KEY`, database URLs, Google client secrets, or Telegram bot tokens
- Bank statement PDFs, mail exports, or database dumps
- A copy of your own ledger used as seed data

The values in `.env.example` are placeholders. Generate your own before you run it. Production boot rejects the known default secrets.

## Reporting a vulnerability

Email the address on the GitHub profile. Do not file a public issue for a vulnerability. Include the version or commit, what an attacker can do, and a way to reproduce it without live credentials.
