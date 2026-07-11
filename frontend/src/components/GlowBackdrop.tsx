"use client";

export function GlowBackdrop() {
  return (
    <div className="glow-backdrop" aria-hidden>
      <div className="glow-orb glow-a" />
      <div className="glow-orb glow-b" />
      <div className="glow-orb glow-c" />
      <div className="glow-ring" />
      <div className="glow-vignette" />
    </div>
  );
}
