"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/cn";

const LightTunnelBackdrop = dynamic(
  () =>
    import("@/components/effects/LightTunnelBackdrop").then(
      (m) => m.LightTunnelBackdrop,
    ),
  { ssr: false },
);

type AppSurfaceBackdropProps = {
  /** Offset tunnel so it does not sit under the fixed sidebar. */
  offsetSidebar?: boolean;
  className?: string;
};

/**
 * Dual-layer backdrop: soft green surface glow + LightTunnel WebGL cables.
 * Inspired by MailAutomater-new AppSurfaceBackdrop.
 */
export function AppSurfaceBackdrop({
  offsetSidebar = false,
  className,
}: AppSurfaceBackdropProps) {
  const offsetClass = offsetSidebar ? "lg:left-[var(--sidebar-width)]" : undefined;

  return (
    <>
      <div
        aria-hidden
        className={cn("pointer-events-none fixed inset-0 z-0", offsetClass, className)}
        style={{
          backgroundImage: "var(--surface-glow)",
          backgroundAttachment: "fixed",
        }}
      />
      <LightTunnelBackdrop className={cn(offsetClass, className)} />
    </>
  );
}
