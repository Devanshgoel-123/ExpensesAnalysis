"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { fetchDashboard, parseStatement } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AmountBand, ParseResult } from "@/lib/types";
import { GlowBackdrop } from "@/components/GlowBackdrop";
import { SiteNav } from "@/components/SiteNav";
import { UploadPanel } from "@/components/UploadPanel";
import { StatsRow } from "@/components/StatsRow";
import { DailyChart } from "@/components/DailyChart";
import { DailyInsightsPanel } from "@/components/DailyInsightsPanel";
import { UpiRankingList } from "@/components/UpiRankingList";
import { MerchantSpendPanel } from "@/components/MerchantSpendPanel";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { PayeeSpendPanel } from "@/components/PayeeSpendPanel";
import { AmountBandPanel } from "@/components/AmountBandPanel";
import { TransactionTable } from "@/components/TransactionTable";
import { SettingsPanel } from "@/components/SettingsPanel";
import { BankPoolingPanel } from "@/components/BankPoolingPanel";
import { AuthGate } from "@/components/AuthGate";

const EMPTY_BAND: AmountBand = {
  label: "",
  min: 0,
  max: 0,
  count: 0,
  total: 0,
  days: [],
  dayCounts: {},
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
  const { token, logout } = useAuth();
  const [data, setData] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [month, setMonth] = useState(currentMonth);

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
      bump();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const monthControl = (
    <label className="field" style={{ minWidth: 140, margin: 0 }}>
      <span className="meta">Month</span>
      <input
        type="month"
        value={month}
        onChange={(e) => setMonth(e.target.value || currentMonth())}
      />
    </label>
  );
  if (!data) {
    return (
      <main className="shell landing">
        <GlowBackdrop />
        <div className="landing-content">
          <SiteNav />
          <div className="badge-pill">
            <Sparkles size={13} /> Personal bank-mail pooling
          </div>
          <header className="brand-block">
            <p className="brand">Ledgerline</p>
            <h1 className="ui-header">Your spends. Sorted. Understood.</h1>
            <p className="lede">
              Molten backdrop. Counted spends. Set your bank senders, pool August,
              and watch top UPI handles add up where the money went.
            </p>
          </header>
          <div style={{ marginBottom: "1rem", maxWidth: 200 }}>{monthControl}</div>
          <UploadPanel onParsed={handleParse} loading={loading} error={error} />
          <div style={{ marginTop: "1.5rem" }}>
            <BankPoolingPanel onChanged={bump} defaultMonth={month} />
          </div>
          <div style={{ marginTop: "1.5rem" }}>
            <SettingsPanel onChanged={bump} />
          </div>
          <footer className="foot-note">
            See the <Link href="/architecture">system architecture</Link>
            <ArrowRight size={14} />
          </footer>
        </div>
      </main>
    );
  }

  const periodLabel =
    data.summary.dateFrom && data.summary.dateTo
      ? `${data.summary.dateFrom} → ${data.summary.dateTo}`
      : `Month ${month}`;
  const categories = data.categories ?? [];
  const amountBand = data.amountBand25to60 ?? EMPTY_BAND;
  const dailyInsights = data.dailyInsights ?? {
    limit: null,
    enabled: false,
    daysOverLimit: [],
    daysUnderLimit: 0,
    totalDaysWithSpend: data.daily.length,
    worstDay: null,
    totalOverLimit: 0,
  };

  return (
    <main className="shell dashboard">
      <GlowBackdrop />
      <div className="dashboard-content">
        <SiteNav />
        <motion.header
          className="dash-top"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div>
            <p className="brand compact">Ledgerline</p>
            <h1 className="ui-header">Expense dashboard</h1>
            <p className="meta">{periodLabel}</p>
          </div>
          <div className="sort-bar">
            {monthControl}
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setData(null);
                setError(null);
              }}
            >
              <ArrowLeft size={16} /> Import another
            </button>
            <button type="button" className="ghost" onClick={logout}>
              Log out
            </button>
          </div>
        </motion.header>

        <StatsRow summary={data.summary} />

        <motion.div
          className="grid-main"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.35 }}
        >
          <DailyChart data={data.daily} insights={dailyInsights} />
          <UpiRankingList items={data.upiRanking} month={month} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
        >
          <DailyInsightsPanel insights={dailyInsights} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.35 }}
        >
          <CategoryBreakdown
            merchants={data.merchantSpend ?? []}
            cigaretteBand={amountBand}
            categories={categories}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.35 }}
        >
          <MerchantSpendPanel
            items={data.merchantSpend ?? []}
            categories={categories}
          />
        </motion.div>

        <motion.div
          className="grid-main"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
        >
          <PayeeSpendPanel items={data.payeeSpend ?? []} />
          <AmountBandPanel
            band={amountBand}
            dateFrom={data.summary.dateFrom}
            dateTo={data.summary.dateTo}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.35 }}
        >
          <BankPoolingPanel onChanged={bump} defaultMonth={month} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.23, duration: 0.35 }}
        >
          <SettingsPanel onChanged={bump} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.35 }}
        >
          <TransactionTable
            items={data.transactions}
            categories={categories}
          />
        </motion.div>
      </div>
    </main>
  );
}

export function Dashboard() {
  return (
    <AuthGate>
      <DashboardInner />
    </AuthGate>
  );
}
