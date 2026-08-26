"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  DASHBOARD_NAV,
  type DashboardView,
} from "@/lib/dashboardViews";
import { easeOut } from "@/lib/motion";

interface CommandItem {
  id: string;
  label: string;
  description: string;
  kind: "view" | "page";
  view?: DashboardView;
  href?: string;
}

const PAGE_ITEMS: CommandItem[] = [
  {
    id: "architecture",
    label: "Architecture",
    description: "How pooling and classification work",
    kind: "page",
    href: "/architecture",
  },
  {
    id: "privacy",
    label: "Privacy policy",
    description: "What we store and why",
    kind: "page",
    href: "/privacy",
  },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: DashboardView) => void;
}

export function CommandPalette({
  open,
  onClose,
  onNavigate,
}: CommandPaletteProps) {
  return (
    <AnimatePresence>
      {open ? (
        <PaletteDialog onClose={onClose} onNavigate={onNavigate} />
      ) : null}
    </AnimatePresence>
  );
}

function PaletteDialog({
  onClose,
  onNavigate,
}: Omit<CommandPaletteProps, "open">) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const items = useMemo(() => {
    const viewItems: CommandItem[] = DASHBOARD_NAV.map((item) => ({
      id: item.id,
      label: item.label,
      description: item.description,
      kind: "view",
      view: item.id,
    }));
    const all = [...viewItems, ...PAGE_ITEMS];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q),
    );
  }, [query]);

  function run(item: CommandItem) {
    if (item.kind === "view" && item.view) onNavigate(item.view);
    if (item.kind === "page" && item.href) router.push(item.href);
    onClose();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[active];
      if (item) run(item);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  return (
    <motion.div
      className="cmd-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <button
        type="button"
        className="cmd-backdrop"
        aria-label="Close search"
        onClick={onClose}
      />
      <motion.div
        className="cmd-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.22, ease: easeOut }}
      >
        <label className="cmd-input-row">
          <Search size={16} />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search views, architecture, privacy…"
            aria-label="Search dashboard"
          />
          <kbd className="kbd">esc</kbd>
        </label>
        <ul className="cmd-list">
          {items.length === 0 ? (
            <li className="cmd-empty">No matches</li>
          ) : (
            items.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`cmd-item${index === active ? " active" : ""}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => run(item)}
                >
                  <strong>{item.label}</strong>
                  <span className="meta">{item.description}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </motion.div>
    </motion.div>
  );
}
