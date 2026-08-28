import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface MetricProps {
  label: string;
  value: ReactNode;
  hint?: string;
  size?: "hero" | "default" | "sm";
  accent?: boolean;
  className?: string;
}

export function Metric({
  label,
  value,
  hint,
  size = "default",
  accent,
  className,
}: MetricProps) {
  return (
    <div className={cn("stat metric-hero", className)}>
      <p className="stat-kicker">{label}</p>
      <strong
        className={cn(
          "display-num",
          size === "hero" && "lg",
          size === "sm" && "sm",
          accent && "accent",
        )}
      >
        {value}
      </strong>
      {hint ? <p className="meta mt-1">{hint}</p> : null}
    </div>
  );
}

export function MetricSkeleton() {
  return (
    <div className="stat metric-hero animate-pulse">
      <div className="h-3 w-20 rounded bg-[var(--bg-muted)]" />
      <div className="mt-3 h-8 w-32 rounded bg-[var(--bg-muted)]" />
      <div className="mt-2 h-3 w-24 rounded bg-[var(--bg-muted)]" />
    </div>
  );
}
