"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
}

export function SpotlightCard({ children, className = "" }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [active, setActive] = useState(false);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  return (
    <div
      ref={ref}
      className={`spotlight-card ${className}`}
      onMouseMove={onMove}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      style={
        {
          ["--spot-x" as string]: `${pos.x}%`,
          ["--spot-y" as string]: `${pos.y}%`,
          ["--spot-opacity" as string]: active ? 1 : 0,
        } as React.CSSProperties
      }
    >
      <div className="spotlight-glow" aria-hidden />
      {children}
    </div>
  );
}
