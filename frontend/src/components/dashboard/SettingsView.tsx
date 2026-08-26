"use client";

import { SettingsPanel } from "@/components/SettingsPanel";
import { PageReveal } from "@/components/motion/PageReveal";

export function SettingsView({ onChanged }: { onChanged?: () => void }) {
  return (
    <PageReveal className="view-stack">
      <SettingsPanel onChanged={onChanged} />
    </PageReveal>
  );
}
