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
  const [box, setBox] = useState({ top: 0, left: 0, width: 420 });
  const anchorRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const categoryLabel =
    categories.find(([slug]) => slug === txn.category)?.[1] ?? "Category";
  const vendor = providers.find((provider) => provider.id === txn.providerId);
  const vendorName = vendor?.canonicalName ?? "App";

  const vendors = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = providers.filter((provider) => {
      if (!provider.categorySlug) return false;
      if (provider.canonicalName.toLowerCase() === "ayodhya") return false;
      if (!q) return true;
      return provider.canonicalName.toLowerCase().includes(q);
    });
    list.sort((a, b) => {
      const aMatch = a.categorySlug === txn.category ? 0 : 1;
      const bMatch = b.categorySlug === txn.category ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return a.canonicalName.localeCompare(b.canonicalName);
    });
    return list;
  }, [providers, query, txn.category]);

  const firstOther = vendors.findIndex(
    (provider) => provider.categorySlug !== txn.category,
  );

  function place() {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(440, window.innerWidth - 16);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    const height = 340;
    let top = rect.bottom + 6;
    if (top + height > window.innerHeight - 8) {
      top = Math.max(8, rect.top - height - 6);
    }
    setBox({ top, left, width });
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    searchRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (popRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onScroll(event: Event) {
      if (popRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  function chooseCategory(slug: string) {
    if (!txn.id || slug === txn.category) return;
    onAssign?.(txn, { categorySlug: slug });
  }

  function chooseVendor(provider: Provider) {
    if (!txn.id || provider.id === txn.providerId) return;
    onAssign?.(txn, {
      providerId: provider.id,
      ...(provider.categorySlug ? { categorySlug: provider.categorySlug } : {}),
    });
  }

  return (
    <div className="txn-assign" ref={anchorRef}>
      <button
        type="button"
        className={`txn-assign-btn ${open ? "open" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{categoryLabel}</span>
        <i className="txn-assign-caret" aria-hidden />
      </button>
      <button
        type="button"
        className={`txn-assign-btn ${open ? "open" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        <BrandMark name={vendorName} logoUrl={vendor?.logoUrl} />
        <span>{vendorName}</span>
        <i className="txn-assign-caret" aria-hidden />
      </button>
      {open && mounted
        ? createPortal(
            <div
              ref={popRef}
              className="txn-picker"
              role="dialog"
              aria-label="Category and app"
              style={{ top: box.top, left: box.left, width: box.width }}
            >
              <div className="txn-picker-col">
                <p className="txn-picker-label">Category</p>
                <ul className="txn-picker-list">
                  {categories.map(([slug, label]) => (
                    <li key={slug}>
                      <button
                        type="button"
                        className={`txn-picker-item ${txn.category === slug ? "active" : ""}`}
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
                  {vendors.length === 0 ? (
                    <li className="txn-picker-empty">No matching apps</li>
                  ) : (
                    vendors.map((provider, index) => (
                      <li key={provider.id}>
                        {index === firstOther && firstOther > 0 ? (
                          <p className="txn-picker-split">Other apps</p>
                        ) : null}
                        <button
                          type="button"
                          className={`txn-picker-item ${txn.providerId === provider.id ? "active" : ""}`}
                          onClick={() => chooseVendor(provider)}
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
