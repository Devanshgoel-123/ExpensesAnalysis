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
import {
  monthsInPoolingWindow,
  poolingScanWindow,
  type ScanWindow,
} from "@/constants/pooling";
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
  /** True while a bank-mail scan is still running. */
  scanning: boolean;
  scanError: string | null;
  /** Live scan counters while a run is in flight. */
  mailScan: {
    phase: "running" | "done" | "failed";
    imported: number;
    scanned: number;
    skipped: number;
  } | null;
  /** Today back to the 1st of the month two months earlier. */
  scanWindow: ScanWindow;
  /** Poll until the current pooling run finishes. Safe to call more than once. */
  watchActiveScan: () => void;
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
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [mailScan, setMailScan] = useState<{
    phase: "running" | "done" | "failed";
    imported: number;
    scanned: number;
    skipped: number;
  } | null>(null);
  const autoMonthDone = useRef(false);
  const scanWatching = useRef(false);
  const scanTimer = useRef<number | null>(null);

  const setMonth = useCallback((next: string) => {
    const months = monthsInPoolingWindow();
    const normalized = normalizeMonth(next);
    if (normalized && months.includes(normalized)) {
      setMonthState(normalized);
      return;
    }
    setMonthState(months[months.length - 1] ?? currentMonth());
  }, []);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const range = useMemo(() => monthBounds(month), [month]);

  const watchActiveScan = useCallback(() => {
    if (!api || scanWatching.current) return;
    scanWatching.current = true;
    setScanning(true);
    setScanError(null);
    let lastImported = -1;

    const stop = (refreshAfter: boolean) => {
      scanWatching.current = false;
      setScanning(false);
      if (scanTimer.current) {
        window.clearTimeout(scanTimer.current);
        scanTimer.current = null;
      }
      if (refreshAfter) refresh();
    };

    const tick = async () => {
      if (!scanWatching.current) return;
      try {
        const status = await api.gmailStatus();
        if (!scanWatching.current) return;
        const run = status.latestRun;
        if (!run || run.status !== "running") {
          setMailScan(
            run
              ? {
                  phase: run.status === "failed" ? "failed" : "done",
                  imported: run.imported ?? 0,
                  scanned: run.scanned ?? 0,
                  skipped: run.skipped ?? 0,
                }
              : null,
          );
          if (run?.status === "failed") {
            setScanError(run.errorMessage ?? "Could not finish the bank-mail scan.");
          }
          stop(true);
          return;
        }

        setMailScan({
          phase: "running",
          imported: run.imported ?? 0,
          scanned: run.scanned ?? 0,
          skipped: run.skipped ?? 0,
        });
        if (run.imported !== lastImported && lastImported >= 0) {
          refresh();
        }
        lastImported = run.imported ?? 0;
        scanTimer.current = window.setTimeout(() => {
          void tick();
        }, 5000);
      } catch {
        scanTimer.current = window.setTimeout(() => {
          void tick();
        }, 8000);
      }
    };

    void tick();
  }, [api, refresh]);

  useEffect(() => {
    return () => {
      scanWatching.current = false;
      if (scanTimer.current) window.clearTimeout(scanTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    void api
      .gmailStatus()
      .then((status) => {
        if (cancelled) return;
        if (status.latestRun?.status === "running") {
          watchActiveScan();
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [api, watchActiveScan]);

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

  useEffect(() => {
    function onFocus() {
      if (scanWatching.current) return;
      setRefreshKey((k) => k + 1);
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

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
      scanning,
      scanError,
      mailScan,
      scanWindow: importStatus?.scanWindow ?? poolingScanWindow(),
      watchActiveScan,
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
      scanning,
      scanError,
      mailScan,
      watchActiveScan,
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
