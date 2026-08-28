"use client";

/**
 * Ledgerline wrapper around count-up motion for financial metrics.
 * Uses the existing LiveCounter implementation (React Bits Count Up pattern).
 * @see docs/react-bits.md
 */
import { LiveCounter } from "@/components/LiveCounter";

interface LedgerlineCountUpProps {
  value: number;
  format?: (n: number) => string;
  durationMs?: number;
  className?: string;
  /** Animate once on mount rather than from previous value. */
  once?: boolean;
}

export function LedgerlineCountUp({
  value,
  format,
  durationMs = 900,
  className,
  once = false,
}: LedgerlineCountUpProps) {
  return (
    <LiveCounter
      value={value}
      format={format}
      durationMs={durationMs}
      className={className}
      continueFromPrevious={!once}
    />
  );
}
