import { appConfig } from "../config";

export const API_BASE = appConfig.apiBaseUrl;

/** Dispatched when any authenticated request returns 401. */
export const SESSION_EXPIRED_EVENT = "ledgerline:session-expired";

const TOKEN_KEY = "ledgerline_token";

function notifySessionExpired(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

/** Parse API error JSON into a user-facing message. */
export async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    const details = data?.error?.details;
    if (Array.isArray(details) && details.length > 0) {
      const first = details[0];
      if (typeof first?.message === "string") {
        return first.path ? `${first.path}: ${first.message}` : first.message;
      }
    }
    if (typeof data?.error?.message === "string") return data.error.message;
    if (typeof data?.detail === "string") return data.detail;
    if (res.status === 401) return "Session expired — sign in again.";
  } catch {
    // ignore malformed JSON
  }
  if (res.status === 401) return "Session expired — sign in again.";
  return "Request failed";
}

/** Build Authorization header for bearer JWT requests. */
export function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    notifySessionExpired();
    throw new Error(await parseError(res));
  }
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as T;
}

/** JSON request helper with optional bearer auth. */
export async function requestJson<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...init } = options;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
      ...init,
      headers: {
        ...headers,
        ...(token ? authHeaders(token) : {}),
      },
    });
    return handleResponse<T>(res);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Network request failed");
  }
}

/** Void request helper with optional bearer auth. */
export async function requestVoid(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<void> {
  const { token, headers, ...init } = options;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...headers,
        ...(token ? authHeaders(token) : {}),
      },
    });
    if (res.status === 401) {
      notifySessionExpired();
      throw new Error(await parseError(res));
    }
    if (!res.ok) throw new Error(await parseError(res));
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Network request failed");
  }
}
