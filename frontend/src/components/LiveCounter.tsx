"use client";

import { useEffect, useRef, useState } from "react";

interface LiveCounterProps {
  value: number;
  durationMs?: number;
  format?: (n: number) => string;
  className?: string;
  /** When true, animate from the previous value instead of always from 0. */
  continueFromPrevious?: boolean;
}

export function LiveCounter({
  value,
  durationMs = 1200,
  format = (n) => String(Math.round(n)),
  className,
  continueFromPrevious = true,
}: LiveCounterProps) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const displayRef = useRef(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const from = continueFromPrevious ? fromRef.current : 0;
    const to = value;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // Smooth ease-out cubic for money / tally add-ups
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (to - from) * eased;
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = to;
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      fromRef.current = displayRef.current;
    };
  }, [value, durationMs, continueFromPrevious]);

  return <span className={className}>{format(display)}</span>;
}
