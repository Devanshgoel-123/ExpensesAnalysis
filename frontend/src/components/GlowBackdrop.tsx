"use client";

export function GlowBackdrop() {
  return (
    <div className="glow-backdrop" aria-hidden>
      <div className="mesh mesh-tr" />
      <div className="mesh mesh-bl" />
      <div className="mesh mesh-center" />
      <div className="glow-vignette" />
    </div>
  );
}
