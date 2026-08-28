# React Bits — Ledgerline Usage

Ledgerline uses a small, intentional subset of [React Bits](https://reactbits.dev/) components. Each choice supports clarity, trust, or scan order — not decoration.

## Count Up

- **React Bits URL:** https://www.reactbits.dev/text-animations/count-up
- **Ledgerline wrapper:** [`frontend/src/components/animations/LedgerlineCountUp.tsx`](../frontend/src/components/animations/LedgerlineCountUp.tsx)
- **Used:** Overview hero metrics (`StatsRow`), chart tooltips, merchant/category totals
- **Why:** Key financial numbers feel alive on first paint without continuous distraction
- **Dependencies:** Existing `LiveCounter` (framer-motion-style RAF easing); aligns with Count Up behavior
- **License:** Free / open source (React Bits OSS collection)

## Fade Content

- **React Bits URL:** https://www.reactbits.dev/animations/fade-content
- **Ledgerline wrapper:** [`frontend/src/components/animations/LedgerlineFadeContent.tsx`](../frontend/src/components/animations/LedgerlineFadeContent.tsx)
- **Used:** Page sections on Overview, Lifestyle, Habits, Import, Settings
- **Why:** Subtle viewport reveals improve hierarchy without page-wide motion
- **Dependencies:** None (Intersection Observer + CSS transitions)
- **License:** Free / open source

## Animated List

- **React Bits URL:** https://www.reactbits.dev/components/animated-list
- **Ledgerline wrapper:** [`frontend/src/components/animations/LedgerlineAnimatedList.tsx`](../frontend/src/components/animations/LedgerlineAnimatedList.tsx)
- **Used:** Top merchants ranking (`MerchantSpendChart`)
- **Why:** Stagger helps scan ranked lists; avoids gamified motion
- **Dependencies:** `framer-motion` (already in project)
- **License:** Free / open source

## Stepper

- **React Bits URL:** https://www.reactbits.dev/components/stepper
- **Ledgerline component:** [`frontend/src/components/imports/ImportStepper.tsx`](../frontend/src/components/imports/ImportStepper.tsx)
- **Used:** Import page pipeline (Upload → Parse → Classify → Deduplicate → Ready)
- **Why:** Communicates real import stages; step reflects actual upload/parse state
- **Dependencies:** None
- **License:** Free / open source

## Line Sidebar (adapted)

- **React Bits URL:** https://www.reactbits.dev/components/line-sidebar
- **Ledgerline adaptation:** [`frontend/src/components/layout/Sidebar.tsx`](../frontend/src/components/layout/Sidebar.tsx) + `.line-sidebar` styles in `globals.css`
- **Used:** Primary dashboard navigation
- **Why:** Marker + subtle active state fits premium fintech; cursor-proximity effect omitted for calmer UX
- **Dependencies:** None
- **License:** Free / open source

## Spotlight Card (existing surface)

- **React Bits URL:** https://www.reactbits.dev/components/spotlight-card
- **Ledgerline:** [`frontend/src/components/SpotlightCard.tsx`](../frontend/src/components/SpotlightCard.tsx) — calm surface wrapper without cursor glow
- **Used:** Panels across dashboard
- **Why:** Consistent elevated surfaces; glow disabled to avoid crypto-dashboard aesthetic
- **License:** Free / open source

## Not used (deliberately)

| Component | Reason skipped |
|-----------|----------------|
| Light Tunnel / WebGL backgrounds | Performance + distraction on data-heavy pages |
| Tilted Card / Reflective Card | 3D effects unsuitable for financial data |
| Threads / Silk / Grid Scan | Decorative; no product insight gain |
| Card Nav / Dock | Over-scoped for current IA |

## Installation note

React Bits supports CLI install via shadcn/jsrepo ([installation guide](https://www.reactbits.dev/get-started/installation)). Ledgerline wraps adapted patterns in `components/animations/` rather than scattering React Bits source across feature files.

## Pro components

React Bits Pro (e.g. App Sidebar) is **not** used. Navigation is adapted from the free Line Sidebar pattern.
