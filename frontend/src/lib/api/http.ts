import { appConfig } from "../config";

export const API_BASE = appConfig.apiBaseUrl;

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

/** JSON request helper with optional bearer auth. */
export async function requestJson<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...init } = options;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...headers,
        ...(token ? authHeaders(token) : {}),
      },
    });
    if (!res.ok) throw new Error(await parseError(res));
    return (await res.json()) as T;
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
    if (!res.ok) throw new Error(await parseError(res));
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Network request failed");
  }
}
