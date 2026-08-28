import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("empty-state panel spotlight-card text-left", className)}>
      <h2 className="ui-header">{title}</h2>
      <p className="meta-lg mt-2">{description}</p>
      {action ? <div className="hero-actions">{action}</div> : null}
    </div>
  );
}

interface EmptyStateLinkProps {
  href: string;
  children: ReactNode;
}

export function EmptyStateLink({ href, children }: EmptyStateLinkProps) {
  return (
    <Link href={href} className="cta">
      {children}
    </Link>
  );
}
