"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { parseStatement } from "@/lib/api";
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

const EMPTY_BAND = {
  label: "₹25 – ₹60",
  min: 25,
  max: 60,
  count: 0,
  total: 0,
  days: [] as string[],
};

export function Dashboard() {
  const [data, setData] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleParse(file: File, password: string) {
    setLoading(true);
    setError(null);
    try {
      const result = await parseStatement(file, password);
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
            <Sparkles size={13} /> Built for UPI statements
          </div>
          <header className="brand-block">
            <p className="brand">Ledgerline</p>
            <h1 className="ui-header">Your spends. Sorted. Understood.</h1>
            <p className="lede">
              Upload a password-protected bank PDF. We parse daily spend, UPI
              payees, Food / Travel / Cigarettes, and people you track — calmly.
            </p>
          </header>
          <UploadPanel onParsed={handleParse} loading={loading} error={error} />
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
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setData(null);
              setError(null);
            }}
          >
            <ArrowLeft size={16} /> New statement
          </button>
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
          transition={{ delay: 0.24, duration: 0.35 }}
        >
          <TransactionTable items={data.transactions} />
        </motion.div>
      </div>
    </main>
  );
}
