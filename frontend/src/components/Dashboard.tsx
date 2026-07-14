"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { fetchDashboard, parseStatement } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ParseResult } from "@/lib/types";
import { GlowBackdrop } from "@/components/GlowBackdrop";
import { SiteNav } from "@/components/SiteNav";
import { UploadPanel } from "@/components/UploadPanel";
import { StatsRow } from "@/components/StatsRow";
import { DailyChart } from "@/components/DailyChart";
import { UpiRankingList } from "@/components/UpiRankingList";
import { MerchantSpendPanel } from "@/components/MerchantSpendPanel";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { PayeeSpendPanel } from "@/components/PayeeSpendPanel";
import { AmountBandPanel } from "@/components/AmountBandPanel";
import { TransactionTable } from "@/components/TransactionTable";
import { SettingsPanel } from "@/components/SettingsPanel";
import { AuthGate } from "@/components/AuthGate";

const EMPTY_BAND = {
  label: "₹25 – ₹60",
  min: 25,
  max: 60,
  count: 0,
  total: 0,
  days: [] as string[],
  dayCounts: {} as Record<string, number>,
};

function DashboardInner() {
  const { token, logout } = useAuth();
  const [data, setData] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (!token || cancelled) return;
      try {
        const result = await fetchDashboard(token);
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
  }, [token, refreshKey]);

  async function handleParse(file: File, password: string) {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await parseStatement(file, password, token);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    return (
      <main className="shell landing">
        <GlowBackdrop />
        <div className="landing-content">
          <SiteNav />
          <div className="badge-pill">
            <Sparkles size={13} /> Invite-only multi-user beta
          </div>
          <header className="brand-block">
            <p className="brand">Ledgerline</p>
            <h1 className="ui-header">Your spends. Sorted. Understood.</h1>
            <p className="lede">
              Upload a password-protected bank PDF, track people with your own
              rules, and optionally connect Gmail for statement backfill.
            </p>
          </header>
          <UploadPanel onParsed={handleParse} loading={loading} error={error} />
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

  const range =
    data.summary.dateFrom && data.summary.dateTo
      ? `${data.summary.dateFrom} → ${data.summary.dateTo}`
      : "Statement period";

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
            <p className="meta">{range}</p>
          </div>
          <div className="sort-bar">
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
          <DailyChart data={data.daily} />
          <UpiRankingList items={data.upiRanking} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.35 }}
        >
          <CategoryBreakdown
            merchants={data.merchantSpend ?? []}
            cigaretteBand={data.amountBand25to60 ?? EMPTY_BAND}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.35 }}
        >
          <MerchantSpendPanel items={data.merchantSpend ?? []} />
        </motion.div>

        <motion.div
          className="grid-main"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
        >
          <PayeeSpendPanel items={data.payeeSpend ?? []} />
          <AmountBandPanel
            band={data.amountBand25to60 ?? EMPTY_BAND}
            dateFrom={data.summary.dateFrom}
            dateTo={data.summary.dateTo}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.35 }}
        >
          <SettingsPanel onChanged={bump} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.35 }}
        >
          <TransactionTable items={data.transactions} />
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
