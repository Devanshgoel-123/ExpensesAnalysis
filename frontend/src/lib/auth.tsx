"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  deleteAccount,
  fetchMe,
  login,
  register,
  type AuthUser,
} from "@/lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  registerWithInvite: (input: {
    email: string;
    password: string;
    inviteCode: string;
    displayName?: string;
  }) => Promise<void>;
  logout: () => void;
  destroyAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const TOKEN_KEY = "ledgerline_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      const saved = localStorage.getItem(TOKEN_KEY);
      if (!saved) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const me = await fetchMe(saved);
        if (cancelled) return;
        setToken(saved);
        setUser(me);
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

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    const result = await login(email, password);
    localStorage.setItem(TOKEN_KEY, result.token);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const registerWithInvite = useCallback(
    async (input: {
      email: string;
      password: string;
      inviteCode: string;
      displayName?: string;
    }) => {
      const result = await register(input);
      localStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
      setUser(result.user);
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

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
      loginWithPassword,
      registerWithInvite,
      logout,
      destroyAccount,
    }),
    [
      user,
      token,
      loading,
      loginWithPassword,
      registerWithInvite,
      logout,
      destroyAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
