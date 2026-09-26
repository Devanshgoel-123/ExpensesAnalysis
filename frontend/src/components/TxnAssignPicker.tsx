"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Transaction } from "@/types";
import type { Provider } from "@/lib/api/types";
import { BrandMark } from "@/components/BrandMark";

interface TxnAssignPickerProps {
  txn: Transaction;
  categories: Array<[string, string]>;
  providers: Provider[];
  disabled?: boolean;
  onAssign?: (
    txn: Transaction,
    patch: { categorySlug?: string; providerId?: string },
  ) => void;
}

function isBank(provider: Provider | undefined): boolean {
  return provider?.categorySlug === "banks";
}

export function TxnAssignPicker({
  txn,
  categories,
  providers,
  disabled,
  onAssign,
}: TxnAssignPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [browse, setBrowse] = useState<string | null>(null);
  const [box, setBox] = useState({ top: 0, left: 0, width: 420, height: 320 });
  const anchorRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const spendCategories = useMemo(
    () => categories.filter(([slug]) => slug !== "banks"),
    [categories],
  );
  const current = providers.find((provider) => provider.id === txn.providerId);
  const labeled = current && !isBank(current) ? current : null;
  const categoryLabel =
    spendCategories.find(([slug]) => slug === txn.category)?.[1] ??
    (txn.category && txn.category !== "banks" ? txn.categoryLabel : null);

  const apps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers
      .filter((provider) => {
        if (!provider.categorySlug || provider.categorySlug === "banks") return false;
        if (provider.canonicalName.toLowerCase() === "ayodhya") return false;
        if (browse && provider.categorySlug !== browse) return false;
        if (!q) return true;
        return provider.canonicalName.toLowerCase().includes(q);
      })
      .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
  }, [providers, query, browse]);

  function place() {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(460, window.innerWidth - 16);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const height = Math.max(220, Math.min(360, Math.max(below, above)));
    const openUp = below < 220 && above > below;
    const top = openUp ? Math.max(8, rect.top - height - 6) : rect.bottom + 6;
    setBox({ top, left, width, height });
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const initial =
      txn.category && txn.category !== "banks" && txn.category !== "other"
        ? txn.category
        : null;
    setBrowse(initial);
    setQuery("");
    place();
    searchRef.current?.focus({ preventScroll: true });

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (popRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  function chooseCategory(slug: string) {
    setBrowse(slug);
    if (!txn.id || slug === txn.category) return;
    onAssign?.(txn, { categorySlug: slug });
  }

  function chooseApp(provider: Provider) {
    if (!txn.id) return;
    onAssign?.(txn, {
      providerId: provider.id,
      ...(provider.categorySlug ? { categorySlug: provider.categorySlug } : {}),
    });
    setOpen(false);
  }

  return (
    <div className="txn-assign" ref={anchorRef}>
      <button
        type="button"
        className={`txn-assign-trigger ${open ? "open" : ""} ${labeled ? "" : "empty"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        <BrandMark
          name={labeled?.canonicalName ?? "?"}
          logoUrl={labeled?.logoUrl}
        />
        <span className="txn-assign-copy">
          <strong>{labeled?.canonicalName ?? "Choose app"}</strong>
          <em>{categoryLabel ?? "Unlabeled"}</em>
        </span>
        <i className="txn-assign-caret" aria-hidden />
      </button>
      {open && mounted
        ? createPortal(
            <div
              ref={popRef}
              className="txn-picker"
              role="dialog"
              aria-label="Where this payment went"
              style={{
                top: box.top,
                left: box.left,
                width: box.width,
                height: box.height,
              }}
            >
              <div className="txn-picker-col">
                <p className="txn-picker-label">Category</p>
                <ul className="txn-picker-list">
                  {spendCategories.map(([slug, label]) => (
                    <li key={slug}>
                      <button
                        type="button"
                        className={`txn-picker-item ${browse === slug ? "active" : ""}`}
                        onClick={() => chooseCategory(slug)}
                      >
                        <span>{label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="txn-picker-col">
                <p className="txn-picker-label">App</p>
                <input
                  ref={searchRef}
                  className="txn-picker-search"
                  type="search"
                  value={query}
                  placeholder="Search apps"
                  onChange={(event) => setQuery(event.target.value)}
                />
                <ul className="txn-picker-list">
                  {apps.length === 0 ? (
                    <li className="txn-picker-empty">
                      {browse ? "No apps in this category" : "Pick a category, or search"}
                    </li>
                  ) : (
                    apps.map((provider) => (
                      <li key={provider.id}>
                        <button
                          type="button"
                          className={`txn-picker-item ${labeled?.id === provider.id ? "active" : ""}`}
                          onClick={() => chooseApp(provider)}
                        >
                          <BrandMark
                            name={provider.canonicalName}
                            logoUrl={provider.logoUrl}
                          />
                          <span>{provider.canonicalName}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
