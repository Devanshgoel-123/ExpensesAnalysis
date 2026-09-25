"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface ChartTooltipProps {
  x: number;
  y: number;
  children: ReactNode;
}

export function ChartTooltip({ x, y, children }: ChartTooltipProps) {
  if (typeof document === "undefined") return null;
  const width = window.innerWidth;
  const left = Math.min(Math.max(x, 96), width - 96);
  const top = Math.max(y - 8, 12);
  return createPortal(
    <div
      className="chart-tooltip"
      role="tooltip"
      style={{
        position: "fixed",
        left,
        top,
        transform: "translate(-50%, -100%)",
        zIndex: 45,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

export interface ChartHover {
  key: string;
  x: number;
  y: number;
}

export function useChartHover() {
  const [hover, setHover] = useState<ChartHover | null>(null);

  const show = (key: string, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setHover({ key, x: rect.left + rect.width / 2, y: rect.top });
  };

  const hide = () => setHover(null);

  return { hover, show, hide };
}

export function TooltipBody({
  title,
  amount,
  lines,
}: {
  title: string;
  amount?: string;
  lines: { text: string; tone?: "calm" | "watch" | "hot" }[];
}) {
  return (
    <>
      <p className="chart-tooltip-title">{title}</p>
      {amount ? <strong>{amount}</strong> : null}
      {lines.length > 0 ? (
        <ul>
          {lines.map((line) => (
            <li key={line.text} className={line.tone ? `tone-${line.tone}` : undefined}>
              {line.text}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
