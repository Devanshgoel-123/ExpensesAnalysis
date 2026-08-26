"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "ledgerline_theme";
const LISTENERS = new Set<() => void>();

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    // Ignore storage errors.
  }
  return null;
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getThemeSnapshot(): ThemeMode {
  return readStoredTheme() ?? (systemPrefersDark() ? "dark" : "light");
}

function getServerSnapshot(): ThemeMode {
  return "light";
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function emitThemeChange() {
  for (const listener of LISTENERS) listener();
}

function subscribe(listener: () => void) {
  LISTENERS.add(listener);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onMedia = () => {
    if (!readStoredTheme()) emitThemeChange();
  };
  media.addEventListener("change", onMedia);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) emitThemeChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    LISTENERS.delete(listener);
    media.removeEventListener("change", onMedia);
    window.removeEventListener("storage", onStorage);
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribe,
    getThemeSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: ThemeMode) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage errors.
    }
    applyTheme(next);
    emitThemeChange();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
