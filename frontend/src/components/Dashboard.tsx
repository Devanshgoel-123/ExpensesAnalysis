"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchDashboard, parseStatement } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { currentMonth, monthBounds, monthFromDate } from "@/lib/month";
import type { AmountBand, DailyInsights, ParseResult } from "@/lib/types";
import type { DashboardView } from "@/lib/dashboardViews";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardViewRouter } from "@/components/dashboard/DashboardViewRouter";

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

function DashboardInner() {
  const { token, user, logout } = useAuth();
  const [data, setData] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [month, setMonth] = useState(currentMonth);
  const [view, setView] = useState<DashboardView>("overview");

  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);
  const range = useMemo(() => monthBounds(month), [month]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (!token || cancelled) return;
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
      } catch {
        // Keep current view if dashboard reload fails.
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey, range, month]);

  async function handleParse(file: File, password: string) {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await parseStatement(file, password, token);
      const parsedMonth = monthFromDate(result.summary.dateTo);
      if (parsedMonth) setMonth(parsedMonth);
      setData(result);
      setView("overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const monthControl = (
    <label className="field field-inline">
      <span className="meta">Month</span>
      <input
        type="month"
        value={month}
        onChange={(e) => setMonth(e.target.value || currentMonth())}
      />
    </label>
  );

  const periodLabel =
    data?.summary.dateFrom && data?.summary.dateTo
      ? `${data.summary.dateFrom} → ${data.summary.dateTo}`
      : `Month ${month}`;

  const amountBand = data?.amountBand25to60 ?? EMPTY_BAND;
  const dailyInsights = data?.dailyInsights ?? EMPTY_INSIGHTS;

  return (
    <AppShell
      view={view}
      onViewChange={setView}
      periodLabel={periodLabel}
      monthControl={monthControl}
      hasData={Boolean(data && data.transactions.length > 0)}
      userEmail={user?.email}
      onImportAnother={() => {
        setData(null);
        setError(null);
        setView("import");
      }}
      onRefresh={bump}
      onLogout={logout}
    >
      <DashboardViewRouter
        view={view}
        data={data}
        dailyInsights={dailyInsights}
        amountBand={amountBand}
        month={month}
        loading={loading}
        error={error}
        onParsed={handleParse}
        onChanged={bump}
        onViewChange={setView}
      />
    </AppShell>
  );
}

export function Dashboard() {
  return (
    <AuthGate>
      <DashboardInner />
    </AuthGate>
  );
}
