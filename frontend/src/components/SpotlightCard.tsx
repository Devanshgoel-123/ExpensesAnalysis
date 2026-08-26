"use client";

import type { ReactNode } from "react";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
}

/** Calm surface wrapper — retains the SpotlightCard API without decorative glow. */
export function SpotlightCard({ children, className = "" }: SpotlightCardProps) {
  return <div className={`spotlight-card ${className}`.trim()}>{children}</div>;
}
