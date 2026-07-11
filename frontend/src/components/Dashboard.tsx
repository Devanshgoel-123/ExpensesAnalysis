"use client";

import { useState } from "react";
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
        <SiteNav />
        <div className="badge-pill">
          <Sparkles size={13} /> Built for UPI statements
        </div>
        <header className="brand-block">
          <p className="brand">Ledgerline</p>
          <h1>Your spends. Sorted. Understood.</h1>
          <p className="lede">
            Upload a password-protected bank PDF. We parse daily spend, UPI
            payees, Food / Travel / Cigarettes, and Deepan — calmly.
          </p>
        </header>
        <UploadPanel onParsed={handleParse} loading={loading} error={error} />
        <footer className="foot-note">
          See the <Link href="/architecture">system architecture</Link>
          <ArrowRight size={14} />
        </footer>
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
      <SiteNav />
      <header className="dash-top">
        <div>
          <p className="brand compact">Ledgerline</p>
          <h1>Expense dashboard</h1>
          <p className="range">{range}</p>
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
      </header>

      <StatsRow summary={data.summary} />

      <div className="grid-main">
        <DailyChart data={data.daily} />
        <UpiRankingList items={data.upiRanking} />
      </div>

      <CategoryBreakdown
        merchants={data.merchantSpend ?? []}
        cigaretteBand={data.amountBand25to60 ?? EMPTY_BAND}
      />

      <MerchantSpendPanel items={data.merchantSpend ?? []} />

      <div className="grid-main">
        <PayeeSpendPanel items={data.payeeSpend ?? []} />
        <AmountBandPanel band={data.amountBand25to60 ?? EMPTY_BAND} />
      </div>

      <TransactionTable items={data.transactions} />
    </main>
  );
}
