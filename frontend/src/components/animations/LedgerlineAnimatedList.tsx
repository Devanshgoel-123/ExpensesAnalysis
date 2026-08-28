"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

interface LedgerlineAnimatedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  className?: string;
}

/**
 * Staggered list entrance inspired by React Bits Animated List.
 * @see docs/react-bits.md
 */
export function LedgerlineAnimatedList<T>({
  items,
  renderItem,
  keyExtractor,
  className,
}: LedgerlineAnimatedListProps<T>) {
  return (
    <ul className={cn("list-none m-0 p-0 grid gap-2", className)}>
      {items.map((item, index) => (
        <motion.li
          key={keyExtractor(item, index)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: Math.min(index * 0.04, 0.35),
            duration: 0.35,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {renderItem(item, index)}
        </motion.li>
      ))}
    </ul>
  );
}
