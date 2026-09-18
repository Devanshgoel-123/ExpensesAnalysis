/** Session JWTs last 7 days, then the client must sign in again. */
export const SESSION_TTL = "7d" as const;
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
