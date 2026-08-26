"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { deleteAccount, fetchMe, type AuthUser } from "@/lib/api";

const TOKEN_KEY = "ledgerline_token";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  authError: string | null;
  logout: () => void;
  destroyAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeJwtPayload(token: string): { exp?: number; iat?: number } | null {
  const part = token.split(".")[1];
  if (!part) return null;
  const padded =
    part.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (part.length % 4)) % 4);
  try {
    return JSON.parse(atob(padded)) as { exp?: number; iat?: number };
  } catch {
    return null;
  }
}

/** Valid until the sooner of JWT exp and 7 days after issue. */
function sessionValidUntil(token: string): number | null {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return null;
  const expMs = payload.exp * 1000;
  const iatMs =
    typeof payload.iat === "number"
      ? payload.iat * 1000
      : expMs - SESSION_MAX_AGE_MS;
  const until = Math.min(expMs, iatMs + SESSION_MAX_AGE_MS);
  if (until <= Date.now()) return null;
  return until;
}

function readStoredToken(): string | null {
  const saved = localStorage.getItem(TOKEN_KEY);
  if (!saved || !sessionValidUntil(saved)) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return saved;
}

function persistToken(token: string): void {
  if (!sessionValidUntil(token)) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
}

function takeAuthParams(): { token: string | null; authError: string | null } {
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  const token = url.searchParams.get("token") ?? hashParams.get("token");
  const authError =
    url.searchParams.get("auth_error") ?? hashParams.get("auth_error");
  if (token || authError) {
    url.searchParams.delete("token");
    url.searchParams.delete("auth_error");
    hashParams.delete("token");
    hashParams.delete("auth_error");
    const qs = url.searchParams.toString();
    const hash = hashParams.toString();
    window.history.replaceState(
      {},
      "",
      `${url.pathname}${qs ? `?${qs}` : ""}${hash ? `#${hash}` : ""}`,
    );
  }
  return { token, authError };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      const fromUrl = takeAuthParams();
      if (fromUrl.authError && !cancelled) {
        setAuthError(fromUrl.authError);
      }

      const candidate = fromUrl.token ?? readStoredToken();
      if (!candidate) {
        if (!cancelled) setLoading(false);
        return;
      }

      persistToken(candidate);
      try {
        const me = await fetchMe(candidate);
        if (cancelled) return;
        setToken(candidate);
        setUser(me);
        setAuthError(null);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    const until = sessionValidUntil(token);
    if (!until) {
      const id = window.setTimeout(() => logout(), 0);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => logout(), until - Date.now());
    return () => window.clearTimeout(id);
  }, [token, logout]);

  const destroyAccount = useCallback(async () => {
    if (!token) return;
    await deleteAccount(token);
    logout();
  }, [token, logout]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      authError,
      logout,
      destroyAccount,
    }),
    [user, token, loading, authError, logout, destroyAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
