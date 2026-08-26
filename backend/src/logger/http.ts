const QUIET_PATHS = new Set([
  "/api/auth/session",
  "/ready",
  "/live",
  "/health",
  "/api/health",
]);

export function isQuietRequest(path: string): boolean {
  const normalized = path.split("?")[0] ?? path;
  return QUIET_PATHS.has(normalized);
}
