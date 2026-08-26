"use client";

import LightTunnel from "@/components/LightTunnel";

export function GlowBackdrop() {
  return (
    <div className="glow-backdrop" aria-hidden>
      <div className="glow-backdrop__tunnel">
        <LightTunnel
          cableColor="#3DBA74"
          pulseColor="#D1FAE5"
          tunnelColor="#0F5F73"
          tunnelOpacity={0.08}
          speed={0.12}
          flowDirection="outward"
          pulseSpeed={1.8}
          pulseLength={0.32}
          pulseBlend={0.8}
          pulseWidth={0.9}
          cableCount={24}
          thickness={0.32}
          rimWidth={0.18}
          waviness={0.36}
          sway={0.42}
          size={0.98}
          centerY={-0.02}
          glow={1.15}
          fadeNear={0.34}
          fadeFar={2.15}
          brightness={1.18}
          colorVariance
          grain
          grainIntensity={0.03}
          opacity={0.92}
          mouseInteraction
          mouseStrength={0.035}
        />
      </div>
      <div className="glow-backdrop__wash" />
      <div className="glow-backdrop__grid" />
      <div className="glow-backdrop__vignette" />
    </div>
  );
}
