"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import "./SpotlightCard.css";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  /** Soft radial glow that follows the cursor. */
  spotlightColor?: string;
}

/**
 * Glass card with mouse-follow spotlight — MailAutomater / Nexus style.
 */
export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "color-mix(in srgb, var(--primary) 28%, transparent)",
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const node = divRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
    node.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
    node.style.setProperty("--spotlight-color", spotlightColor);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      className={cn("card-spotlight spotlight-card", className)}
    >
      {children}
    </div>
  );
}
