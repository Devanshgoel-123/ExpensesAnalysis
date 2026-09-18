import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type LoadingStateProps = {
  text?: string;
  variant?: "inline" | "panel" | "overlay" | "skeleton";
  className?: string;
};

function BouncingDots() {
  return (
    <span className="inline-flex items-center gap-1.5" aria-hidden>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="loading-dot bg-[var(--primary)]"
          style={{ animationDelay: `${index * 0.16}s` }}
        />
      ))}
    </span>
  );
}

function MatterPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("loading-matter-panel", className)}>{children}</div>
  );
}

/**
 * Ledgerline loading states — MailAutomater matter-panel style.
 */
export function LoadingState({
  text = "Loading",
  variant = "panel",
  className,
}: LoadingStateProps) {
  const label = (
    <span className="flex items-center gap-2.5">
      <span className="text-[var(--primary)] font-medium tracking-tight">{text}</span>
      <BouncingDots />
    </span>
  );

  if (variant === "inline") {
    return (
      <div
        className={cn("flex items-center py-2", className)}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        {label}
      </div>
    );
  }

  if (variant === "skeleton") {
    return (
      <div className={cn("view-stack", className)} role="status" aria-busy="true">
        <div className="skeleton skeleton-hero" />
        <div className="stats-row hero-metrics">
          <div className="skeleton skeleton-metric" />
          <div className="metric-support-grid">
            <div className="skeleton skeleton-stat" />
            <div className="skeleton skeleton-stat" />
            <div className="skeleton skeleton-stat" />
            <div className="skeleton skeleton-stat" />
          </div>
        </div>
        <div className="grid-main">
          <div className="skeleton skeleton-chart" />
          <div className="skeleton skeleton-chart" />
        </div>
        <span className="sr-only">{text}</span>
      </div>
    );
  }

  if (variant === "overlay") {
    return (
      <div
        className={cn("loading-overlay", className)}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <MatterPanel>{label}</MatterPanel>
      </div>
    );
  }

  return (
    <div
      className={cn("loading-panel-wrap", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <MatterPanel>{label}</MatterPanel>
    </div>
  );
}
