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
import { fetchDashboard, parseStatement } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { currentMonth, monthBounds, monthFromDate } from "@/lib/month";
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

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [month, setMonth] = useState(currentMonth);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const range = useMemo(() => monthBounds(month), [month]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (!token || cancelled) return;
      setFetchError(null);
      try {
        const result = await fetchDashboard(token, range);
        if (cancelled) return;

        if (result.transactions.length === 0) {
          const all = await fetchDashboard(token);
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
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey, range, month]);

  const handleParse = useCallback(
    async (file: File, password: string) => {
      if (!token) return;
      setLoading(true);
      setParseError(null);
      try {
        const result = await parseStatement(file, password, token);
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
    [token, router],
  );

  const goToImport = useCallback(() => {
    router.push(pathForView("import"));
  }, [router]);

  const periodLabel =
    data?.summary.dateFrom && data?.summary.dateTo
      ? `${data.summary.dateFrom} → ${data.summary.dateTo}`
      : `Month ${month}`;

  const value = useMemo(
    (): DashboardContextValue => ({
      data,
      loading,
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
      fetchError,
      parseError,
      month,
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

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within DashboardProvider");
  }
  return ctx;
}
