"use client";

import { SettingsPanel } from "@/components/SettingsPanel";

export function SettingsView({ onChanged }: { onChanged?: () => void }) {
  return (
    <div className="view-stack">
      <SettingsPanel onChanged={onChanged} />
    </div>
  );
}
