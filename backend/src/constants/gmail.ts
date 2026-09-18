export const GMAIL_READONLY_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly";

/** Gaxios timeout so list/history calls cannot hang the worker lock forever. */
export const GMAIL_REQUEST_TIMEOUT_MS = 20_000;

export const GOOGLE_LOGIN_SCOPES = ["openid", "email", "profile"] as const;

export const DEFAULT_HDFC_SENDERS = [
  "hdfcbank.net",
  "hdfcbank.com",
  "alerts@hdfcbank.net",
] as const;
