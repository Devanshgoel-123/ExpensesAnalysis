"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BrandMark } from "@/components/BrandMark";
import type { Provider } from "@/lib/api/types";

interface VendorLogoPickerProps {
  providers: Provider[];
  value: string;
  disabled?: boolean;
  onChange: (providerId: string) => void;
}

export function VendorLogoPicker({
  providers,
  value,
  disabled,
  onChange,
}: VendorLogoPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [box, setBox] = useState({ top: 0, left: 0, width: 260, height: 280 });
  const [placed, setPlaced] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = providers.find((provider) => provider.id === value) ?? null;

  const vendors = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers
      .filter((provider) => !q || provider.canonicalName.toLowerCase().includes(q))
      .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
  }, [providers, query]);

  function place() {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(320, Math.max(rect.width, 240), window.innerWidth - 16);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const height = Math.max(180, Math.min(320, Math.max(below, above)));
    const openUp = below < 180 && above > below;
    const top = openUp ? Math.max(8, rect.top - height - 6) : rect.bottom + 6;
    setBox({
      top: Math.round(top),
      left: Math.round(left),
      width: Math.round(width),
      height: Math.round(height),
    });
    setPlaced(true);
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset UI state when menu opens/closes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) {
      // Reset placed state when menu closes
      setPlaced(false);
      return;
    }
    // Reset search and position when menu opens
    setQuery("");
    place();

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

  useEffect(() => {
    if (!open || !placed) return;
    searchRef.current?.focus({ preventScroll: true });
  }, [open, placed]);

  function choose(provider: Provider) {
    onChange(provider.id);
    setOpen(false);
  }

  return (
    <div className="txn-assign statement-vendor" ref={anchorRef}>
      <button
        type="button"
        className={`txn-assign-trigger ${open ? "open" : ""} ${selected ? "" : "empty"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        {selected ? (
          <BrandMark name={selected.canonicalName} logoUrl={selected.logoUrl} />
        ) : (
          <span className="brand-mark statement-vendor-placeholder" aria-hidden />
        )}
        <span className="txn-assign-copy">
          <strong>{selected?.canonicalName ?? "Choose vendor"}</strong>
        </span>
        <i className="txn-assign-caret" aria-hidden />
      </button>
      {open && mounted && placed
        ? createPortal(
            <div
              ref={popRef}
              className="txn-picker statement-vendor-menu"
              role="listbox"
              aria-label="Vendors"
              style={{
                top: box.top,
                left: box.left,
                width: box.width,
                height: box.height,
              }}
            >
              <div className="txn-picker-col">
                <input
                  ref={searchRef}
                  className="txn-picker-search"
                  type="search"
                  value={query}
                  placeholder="Search vendors"
                  onChange={(event) => setQuery(event.target.value)}
                />
                <ul className="txn-picker-list">
                  {vendors.length === 0 ? (
                    <li className="txn-picker-empty">No vendors match</li>
                  ) : (
                    vendors.map((provider) => (
                      <li key={provider.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={provider.id === value}
                          className={`txn-picker-item ${provider.id === value ? "active" : ""}`}
                          onClick={() => choose(provider)}
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
