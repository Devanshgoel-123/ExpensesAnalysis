"use client";

/**
 * Calm, theme-aware backdrop — no WebGL on data-heavy screens.
 */
export function GlowBackdrop() {
  return (
    <div className="glow-backdrop glow-backdrop--calm" aria-hidden>
      <div className="glow-backdrop__wash" />
      <div className="glow-backdrop__grid" />
      <div className="glow-backdrop__vignette" />
    </div>
  );
}
