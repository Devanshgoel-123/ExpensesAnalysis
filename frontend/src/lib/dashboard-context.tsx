"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/useApi";
import { currentMonth, monthBounds, monthFromDate, normalizeMonth } from "@/lib/month";
import { formatPeriodRange } from "@/lib/dates";
import { formatMonthTitle } from "@/lib/finance";
import type { AmountBand, DailyInsights, ParseResult } from "@/lib/types";
import { pathForView } from "@/lib/dashboardViews";

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
  hasData: boolean;
  dailyInsights: DailyInsights;
  amountBand: AmountBand;
  periodLabel: string;
  goToImport: () => void;
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

  const setMonth = useCallback((next: string) => {
    setMonthState(normalizeMonth(next) ?? currentMonth());
  }, []);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const range = useMemo(() => monthBounds(month), [month]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (!api || cancelled) return;
      setFetchError(null);
      setFetching(true);
      try {
        const result = await api.fetchDashboard(range);
        if (cancelled) return;

        if (result.transactions.length === 0) {
          const all = await api.fetchDashboard();
          if (cancelled) return;
          const latestMonth = monthFromDate(all.summary.dateTo);
          if (
            all.transactions.length > 0 &&
            latestMonth &&
            latestMonth !== month &&
            month === currentMonth()
          ) {
            setMonth(latestMonth);
            return;
          }
          setData(all.transactions.length > 0 ? all : result);
          return;
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
        if (parsedMonth) setMonth(parsedMonth);
        setData(result);
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

  const periodLabel =
    data?.summary.dateFrom && data?.summary.dateTo
      ? formatPeriodRange(data.summary.dateFrom, data.summary.dateTo)
      : formatMonthTitle(month);

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
      hasData: Boolean(data && data.transactions.length > 0),
      dailyInsights: data?.dailyInsights ?? EMPTY_INSIGHTS,
      amountBand: data?.amountBand25to60 ?? EMPTY_BAND,
      periodLabel,
      goToImport,
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
      handleParse,
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
