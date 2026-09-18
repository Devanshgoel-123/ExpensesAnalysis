"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/cn";

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
        cableColor={isDark ? "#7fe6a6" : "#17b061"}
        pulseColor={isDark ? "#c5f6d8" : "#0d5a31"}
        tunnelColor={isDark ? "#17b061" : "#0a3d22"}
        tunnelOpacity={isDark ? 0.1 : 0.05}
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
        glow={1.1}
        fadeNear={0.28}
        fadeFar={2.2}
        brightness={isDark ? 0.72 : 0.42}
        colorVariance
        grain
        grainIntensity={0.035}
        opacity={isDark ? 0.62 : 0.38}
        mouseInteraction
        mouseStrength={0.07}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[color-mix(in_srgb,var(--bg)_25%,transparent)] via-[color-mix(in_srgb,var(--bg)_50%,transparent)] to-[color-mix(in_srgb,var(--bg)_78%,transparent)]" />
    </div>
  );
}
