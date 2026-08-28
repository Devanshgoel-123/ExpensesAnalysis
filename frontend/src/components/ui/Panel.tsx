import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PanelProps {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
  "aria-label"?: string;
}

export function Panel({
  children,
  className,
  as: Tag = "section",
  "aria-label": ariaLabel,
}: PanelProps) {
  return (
    <Tag className={cn("panel spotlight-card", className)} aria-label={ariaLabel}>
      {children}
    </Tag>
  );
}

interface PanelHeadProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PanelHead({ title, subtitle, action }: PanelHeadProps) {
  return (
    <header className="panel-head flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="ui-header">{title}</h2>
        {subtitle ? <p className="meta mt-1">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}
