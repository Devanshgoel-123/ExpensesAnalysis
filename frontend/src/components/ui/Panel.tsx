import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SpotlightCard } from "@/components/SpotlightCard";

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
    <SpotlightCard className={cn("panel", className)}>
      <Tag aria-label={ariaLabel} className="contents">
        {children}
      </Tag>
    </SpotlightCard>
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
