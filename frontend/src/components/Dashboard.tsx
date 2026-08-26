"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchDashboard, parseStatement } from "@/lib/api";
import { useAuth } from "@/lib/auth";
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

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthBounds(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const from = `${month}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${month}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

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
        if (result.transactions.length > 0) setData(result);
        else setData(null);
      } catch {
        // Keep current view if dashboard reload fails.
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey, range]);

  async function handleParse(file: File, password: string) {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await parseStatement(file, password, token);
      setData(result);
      setView("overview");
      bump();
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
  const dailyInsights = data?.dailyInsights ?? {
    ...EMPTY_INSIGHTS,
    totalDaysWithSpend: data?.daily.length ?? 0,
  };

  return (
    <AppShell
      view={view}
      onViewChange={setView}
      periodLabel={periodLabel}
      monthControl={monthControl}
      hasData={Boolean(data)}
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
