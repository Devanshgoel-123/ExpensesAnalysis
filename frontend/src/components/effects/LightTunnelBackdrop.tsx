"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/helpers/cn";

const LightTunnel = dynamic(() => import("@/components/effects/LightTunnel"), {
  ssr: false,
});

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Theme-aware WebGL light tunnel — same treatment as MailAutomater-new.
 * Skipped when the user prefers reduced motion.
 */
export function LightTunnelBackdrop({ className }: { className?: string }) {
  const { theme } = useTheme();
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );
  const isDark = theme !== "light";

  if (reduceMotion) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 z-0 overflow-hidden",
        className,
      )}
    >
      <LightTunnel
        className="h-full w-full"
        cableColor={isDark ? "#5c4638" : "#8a6a52"}
        pulseColor={isDark ? "#cbbfae" : "#6a5344"}
        tunnelColor={isDark ? "#1a1410" : "#3a2c22"}
        tunnelOpacity={isDark ? 0.08 : 0.04}
        speed={0.07}
        flowDirection="outward"
        pulseSpeed={1.5}
        pulseLength={0.34}
        pulseBlend={1}
        pulseWidth={0.8}
        cableCount={20}
        thickness={0.3}
        rimWidth={0.16}
        waviness={0.26}
        sway={0.35}
        size={1.08}
        centerX={0}
        centerY={0}
        glow={0.35}
        fadeNear={0.28}
        fadeFar={2.2}
        brightness={isDark ? 0.28 : 0.2}
        colorVariance
        grain
        grainIntensity={0.035}
        opacity={isDark ? 0.28 : 0.16}
        mouseInteraction
        mouseStrength={0.07}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[color-mix(in_srgb,var(--bg)_25%,transparent)] via-[color-mix(in_srgb,var(--bg)_50%,transparent)] to-[color-mix(in_srgb,var(--bg)_78%,transparent)]" />
    </div>
  );
}
