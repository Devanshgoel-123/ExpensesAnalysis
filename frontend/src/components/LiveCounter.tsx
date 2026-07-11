"use client";

import { useEffect, useState } from "react";

interface LiveCounterProps {
  value: number;
  durationMs?: number;
  format?: (n: number) => string;
  className?: string;
}

export function LiveCounter({
  value,
  durationMs = 1100,
  format = (n) => String(Math.round(n)),
  className,
}: LiveCounterProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const from = 0;
    const to = value;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return <span className={className}>{format(display)}</span>;
}
