"use client";

import { FileUp, Zap, BookOpen } from "lucide-react";
import { SpotlightCard } from "@/components/SpotlightCard";

interface OnboardingWelcomeProps {
  onStartImport: () => void;
  onTryDemo: () => void;
  onLearnMore: () => void;
}

export function OnboardingWelcome({
  onStartImport,
  onTryDemo,
  onLearnMore,
}: OnboardingWelcomeProps) {
  return (
    <div className="view-stack min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Welcome to Ledgerline</h1>
          <p className="text-lg text-muted mb-2">
            Track your UPI spending with bank statements and Gmail alerts
          </p>
          <p className="text-sm text-muted-2">
            Understand where your money goes. One unified view of all your transactions.
          </p>
        </div>

        <div className="grid gap-4 mb-8">
          <button type="button" onClick={onStartImport} className="text-left">
            <SpotlightCard className="panel hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100">
                    <FileUp className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Import Bank Statements</h3>
                  <p className="text-sm text-muted mb-3">
                    Upload HDFC PDF statements or connect Gmail for automatic bank alerts
                  </p>
                  <div className="flex items-center text-xs text-blue-600 font-medium">
                    Start here →
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </button>

          <button type="button" onClick={onTryDemo} className="text-left">
            <SpotlightCard className="panel hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100">
                    <Zap className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Explore Demo Data</h3>
                  <p className="text-sm text-muted mb-3">
                    See how Ledgerline works with sample transactions. No real data required.
                  </p>
                  <div className="flex items-center text-xs text-green-600 font-medium">
                    Try it out →
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </button>

          <button type="button" onClick={onLearnMore} className="text-left">
            <SpotlightCard className="panel hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-purple-100">
                    <BookOpen className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Learn How It Works</h3>
                  <p className="text-sm text-muted mb-3">
                    Watch a quick guide or read the documentation to understand Ledgerline
                  </p>
                  <div className="flex items-center text-xs text-purple-600 font-medium">
                    Read docs →
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </button>
        </div>

        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h3 className="font-semibold mb-4">What Ledgerline Does</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li className="flex items-center gap-2">
              <span className="text-blue-600">✓</span>
              Import UPI transactions from HDFC bank statements (PDF)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-600">✓</span>
              Monitor real-time alerts via Gmail integration
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-600">✓</span>
              Categorize spending by merchant and category
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-600">✓</span>
              Split bills with friends and track shared expenses
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-600">✓</span>
              Set daily spending limits and get alerts
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-600">✓</span>
              Analyze spending patterns over time
            </li>
          </ul>
        </div>

        <div className="text-center text-sm text-muted">
          <p className="mb-4">
            <strong>First time?</strong> Most users start by importing a recent bank statement.
          </p>
          <p className="text-xs">
            Your financial data stays private. Ledgerline is open-source and self-hosted.
          </p>
        </div>
      </div>
    </div>
  );
}
