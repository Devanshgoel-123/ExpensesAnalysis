"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface LedgerlineFadeContentProps {
  children: ReactNode;
  className?: string;
  /** Delay before reveal in ms */
  delay?: number;
  /** Slide distance in px */
  distance?: number;
}

/**
 * Threshold-based fade/slide reveal inspired by React Bits Fade Content.
 * Respects prefers-reduced-motion.
 * @see docs/react-bits.md
 */
export function LedgerlineFadeContent({
  children,
  className,
  delay = 0,
  distance = 12,
}: LedgerlineFadeContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : `translateY(${distance}px)`,
        transition: `opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 0.45s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
