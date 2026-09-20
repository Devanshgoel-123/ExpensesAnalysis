"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/useApi";
import { currentMonth, monthBounds, monthFromDate, normalizeMonth } from "@/helpers/month";
import { formatMonthTitle } from "@/helpers/finance";
import type { AmountBand, DailyInsights, ParseResult } from "@/types";
import { pathForView } from "@/lib/dashboardViews";
import type { ImportStatus } from "@/lib/api/types";

const EMPTY_BAND: AmountBand = {
  label: "",
  min: 0,
  max: 0,
  count: 0,
  total: 0,
  days: [],
  dayCounts: {},
};

const EMPTY_INSIGHTS: DailyInsights = {
  limit: null,
  enabled: false,
  daysOverLimit: [],
  daysUnderLimit: 0,
  totalDaysWithSpend: 0,
  worstDay: null,
  totalOverLimit: 0,
};

interface DashboardContextValue {
  data: ParseResult | null;
  loading: boolean;
  /** True while the dashboard analytics fetch is in flight. */
  fetching: boolean;
  fetchError: string | null;
  parseError: string | null;
  month: string;
  setMonth: (month: string) => void;
  refresh: () => void;
  parseStatement: (file: File, password: string) => Promise<void>;
  /** @deprecated Prefer hasMonthData / hasAnyData. */
  hasData: boolean;
  /** Selected month has transactions. */
  hasMonthData: boolean;
  /** Account has any transactions (any month). */
  hasAnyData: boolean;
  /** Bootstrap status from GET /api/imports/status. */
  importStatus: ImportStatus | null;
  /** Refresh bootstrap status (after import/pooling). */
  refreshStatus: () => Promise<void>;
  dailyInsights: DailyInsights;
  amountBand: AmountBand;
  periodLabel: string;
  goToImport: () => void;
  goToOverview: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

/** Shared dashboard data, month selection, and import actions for all routes. */
export function DashboardProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const router = useRouter();
  const [data, setData] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [month, setMonthState] = useState(() => currentMonth());
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const autoMonthDone = useRef(false);

  const setMonth = useCallback((next: string) => {
    setMonthState(normalizeMonth(next) ?? currentMonth());
  }, []);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const range = useMemo(() => monthBounds(month), [month]);

  const refreshStatus = useCallback(async () => {
    if (!api) return;
    try {
      const status = await api.fetchImportStatus();
      setImportStatus(status);
    } catch {
      // Status is best-effort; dashboard fetch surfaces errors.
    }
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (!api || cancelled) return;
      try {
        const status = await api.fetchImportStatus();
        if (!cancelled) setImportStatus(status);
      } catch {
        if (!cancelled) setImportStatus(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [api, refreshKey]);

  // Refresh analytics when returning to the tab if bank-mail pooling is active.
  useEffect(() => {
    if (!api) return;
    const client = api;
    let poolingOn = false;
    let cancelled = false;
    void client
      .gmailStatus()
      .then((s) => {
        if (!cancelled) poolingOn = Boolean(s.poolingEnabled);
      })
      .catch(() => undefined);

    function onFocus() {
      if (!poolingOn) return;
      void client.fetchImportStatus().then(setImportStatus).catch(() => undefined);
      setRefreshKey((k) => k + 1);
    }
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (!api || cancelled) return;
      setFetchError(null);
      setFetching(true);
      try {
        const result = await api.fetchDashboard(range);
        if (cancelled) return;

        if (
          result.transactions.length === 0 &&
          !autoMonthDone.current &&
          month === currentMonth()
        ) {
          const status = await api.fetchImportStatus();
          if (cancelled) return;
          setImportStatus(status);
          if (
            status.hasTransactions &&
            status.latestMonth &&
            status.latestMonth !== month
          ) {
            autoMonthDone.current = true;
            setMonth(status.latestMonth);
            return;
          }
          autoMonthDone.current = true;
        }

        setData(result);
      } catch (err) {
        if (!cancelled) {
          setFetchError(
            err instanceof Error ? err.message : "Could not load dashboard",
          );
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [api, refreshKey, range, month, setMonth]);

  const handleParse = useCallback(
    async (file: File, password: string) => {
      if (!api) return;
      setLoading(true);
      setParseError(null);
      try {
        const result = await api.parseStatement(file, password);
        const parsedMonth = monthFromDate(result.summary.dateTo);
        const targetMonth = parsedMonth ?? currentMonth();
        autoMonthDone.current = true;
        setMonth(targetMonth);
        const monthResult = await api.fetchDashboard(monthBounds(targetMonth));
        setData(monthResult);
        const status = await api.fetchImportStatus();
        setImportStatus(status);
        router.push(pathForView("overview"));
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [api, router, setMonth],
  );

  const goToImport = useCallback(() => {
    router.push(pathForView("import"));
  }, [router]);

  const goToOverview = useCallback(() => {
    router.push(pathForView("overview"));
  }, [router]);

  const hasMonthData = Boolean(data && data.transactions.length > 0);
  const hasAnyData =
    Boolean(importStatus?.hasTransactions) || hasMonthData;

  const periodLabel = formatMonthTitle(month);

  const value = useMemo(
    (): DashboardContextValue => ({
      data,
      loading,
      fetching,
      fetchError,
      parseError,
      month,
      setMonth,
      refresh,
      parseStatement: handleParse,
      hasData: hasMonthData,
      hasMonthData,
      hasAnyData,
      importStatus,
      refreshStatus,
      dailyInsights: data?.dailyInsights ?? EMPTY_INSIGHTS,
      amountBand: data?.amountBand25to60 ?? EMPTY_BAND,
      periodLabel,
      goToImport,
      goToOverview,
    }),
    [
      data,
      loading,
      fetching,
      fetchError,
      parseError,
      month,
      setMonth,
      refresh,
      periodLabel,
      goToImport,
      goToOverview,
      handleParse,
      hasMonthData,
      hasAnyData,
      importStatus,
      refreshStatus,
    ],
  );

  return (
    <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
  );
}

/** Access dashboard state from any page under `(dashboard)`. */
export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within DashboardProvider");
  }
  return ctx;
}
