"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CategorySummary, Transaction } from "@/types";
import type { Provider } from "@/lib/api/types";
import { BrandMark } from "@/components/BrandMark";
import { logoForCategory } from "@/helpers/apps";
import { useApi } from "@/lib/useApi";

interface TxnAssignPickerProps {
  txn: Transaction;
  categories: CategorySummary[];
  providers: Provider[];
  disabled?: boolean;
  onAssign?: (
    txn: Transaction,
    patch: {
      categorySlug?: string | null;
      providerId?: string | null;
      payee?: string | null;
    },
  ) => void;
}

interface TrackedPerson {
  name: string;
  group: "friend" | "family";
  upiIds: string[];
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
  const ignoreAppClick = useRef(false);
  const api = useApi();
  const [people, setPeople] = useState<TrackedPerson[]>([]);

  const spendCategories = useMemo(() => {
    const parents = categories.filter(
      (category) => category.slug !== "banks" && !category.meta?.parent,
    );
    const banks = categories.find((category) => category.slug === "banks");
    return banks ? [...parents, banks] : parents;
  }, [categories]);
  const current = providers.find((provider) => provider.id === txn.providerId);
  const bankChoice = current && isBank(current) && txn.category === "banks" ? current : null;
  const labeled = current && !isBank(current) ? current : null;
  const category = categories.find((item) => item.slug === txn.category);
  const categoryLabel =
    category?.label ??
    (txn.category && txn.category !== "banks" ? txn.categoryLabel : null);
  const categoryMark = txn.category ? logoForCategory(txn.category) : null;
  const parentLabel = category?.meta?.parent
    ? categories.find((item) => item.slug === category.meta?.parent)?.label
    : null;
  const subcategories = useMemo(
    () => categories.filter((category) => category.meta?.parent === browse),
    [categories, browse],
  );

  const apps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers
      .filter((provider) => {
        if (!provider.categorySlug || provider.categorySlug === "banks") return false;
        if (provider.canonicalName.toLowerCase() === "ayodhya") return false;
        const childSlugs = new Set(
          categories
            .filter((category) => category.meta?.parent === browse)
            .map((category) => category.slug),
        );
        if (
          browse &&
          provider.categorySlug !== browse &&
          !childSlugs.has(provider.categorySlug)
        ) {
          return false;
        }
        if (!q) return true;
        return provider.canonicalName.toLowerCase().includes(q);
      })
      .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
  }, [providers, categories, query, browse]);

  const banks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers
      .filter((provider) => provider.categorySlug === "banks")
      .filter((provider) => !q || provider.canonicalName.toLowerCase().includes(q))
      .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
  }, [providers, query]);

  const shownPeople = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((person) => !q || person.name.toLowerCase().includes(q));
  }, [people, query]);

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
    const stored = categories.find((item) => item.slug === txn.category);
    const initial =
      stored?.meta?.parent ??
      (txn.category && txn.category !== "banks" && txn.category !== "other"
        ? txn.category
        : null);
    setBrowse(initial);
    setQuery("");
    if (api) {
      void api.listRules().then((res) => {
        const next: TrackedPerson[] = [];
        for (const rule of res.rules) {
          const name = typeof rule.setPayeeName === "string" ? rule.setPayeeName : "";
          if (!name) continue;
          const tags = Array.isArray(rule.setTags) ? rule.setTags : [];
          const group = tags.includes("family")
            ? "family"
            : tags.includes("friend")
              ? "friend"
              : null;
          if (!group) continue;
          const upi = typeof rule.matchUpiId === "string" ? rule.matchUpiId : "";
          const existing = next.find((person) => person.name.toLowerCase() === name.toLowerCase());
          if (existing) {
            if (upi && !existing.upiIds.includes(upi)) existing.upiIds.push(upi);
            continue;
          }
          next.push({ name, group, upiIds: upi ? [upi] : [] });
        }
        next.sort((a, b) => a.name.localeCompare(b.name));
        setPeople(next);
      });
    }
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
    // The app list re-renders under the pointer. Ignore the click that follows
    // so a category press cannot select whichever app lands there.
    ignoreAppClick.current = true;
    window.setTimeout(() => {
      ignoreAppClick.current = false;
    }, 250);
    setBrowse(slug);
  }

  function chooseSubcategory(slug: string) {
    if (!txn.id) return;
    onAssign?.(txn, { categorySlug: slug, providerId: null });
    setOpen(false);
  }

  function resetCategory() {
    if (!txn.id) return;
    onAssign?.(txn, { categorySlug: null, providerId: null });
    setOpen(false);
  }

  async function choosePerson(person: TrackedPerson) {
    if (!txn.id) return;
    const upi = txn.upiId?.trim().toLowerCase();
    if (api && upi?.includes("@") && !person.upiIds.some((id) => id.toLowerCase() === upi)) {
      try {
        await api.attachPersonUpi({ name: person.name, upiId: upi });
      } catch {
        // The payment is still labeled with this person if the UPI save fails.
      }
    }
    onAssign?.(txn, {
      payee: person.name,
      providerId: null,
      categorySlug: "family",
    });
    setOpen(false);
  }

  function chooseApp(provider: Provider) {
    if (!txn.id || ignoreAppClick.current) return;
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
        className={`txn-assign-trigger ${open ? "open" : ""} ${labeled || bankChoice || txn.payee || (txn.category && txn.category !== "other") ? "" : "empty"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        <BrandMark
          name={labeled?.canonicalName ?? bankChoice?.canonicalName ?? txn.payee ?? categoryLabel ?? "?"}
          logoUrl={labeled?.logoUrl ?? bankChoice?.logoUrl ?? categoryMark}
        />
        <span className="txn-assign-copy">
          <strong>
            {labeled?.canonicalName ??
              bankChoice?.canonicalName ??
              txn.payee ??
              categoryLabel ??
              "Choose app"}
          </strong>
          <em>
            {labeled || bankChoice
              ? categoryLabel
              : txn.payee
                ? "Family"
                : (parentLabel ?? categoryLabel ?? "Unlabeled")}
          </em>
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
                  {spendCategories.map((category) => (
                    <li key={category.slug}>
                      <button
                        type="button"
                        className={`txn-picker-item ${browse === category.slug ? "active" : ""}`}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          chooseCategory(category.slug);
                        }}
                      >
                        <span>{category.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {txn.category || labeled ? (
                  <button type="button" className="txn-picker-reset" onClick={resetCategory}>
                    Reset category
                  </button>
                ) : null}
              </div>
              <div className="txn-picker-col">
                <p className="txn-picker-label">
                  {browse === "family" ? "People" : browse === "banks" ? "Bank" : "App"}
                </p>
                <input
                  ref={searchRef}
                  className="txn-picker-search"
                  type="search"
                  value={query}
                  placeholder={
                    browse === "family"
                      ? "Search friends and family"
                      : browse === "banks"
                        ? "Search banks"
                        : "Search apps"
                  }
                  onChange={(event) => setQuery(event.target.value)}
                />
                <ul className="txn-picker-list">
                  {browse === "family" ? (
                    shownPeople.length === 0 ? (
                      <li className="txn-picker-empty">Add friends and family on People first</li>
                    ) : (
                      (["family", "friend"] as const).map((group) => {
                        const list = shownPeople.filter((person) => person.group === group);
                        if (list.length === 0) return null;
                        return (
                          <li key={group}>
                            <p className="txn-picker-split">{group === "family" ? "Family" : "Friends"}</p>
                            <ul className="txn-picker-list">
                              {list.map((person) => (
                                <li key={person.name}>
                                  <button
                                    type="button"
                                    className={`txn-picker-item ${txn.payee?.toLowerCase() === person.name.toLowerCase() ? "active" : ""}`}
                                    onClick={() => void choosePerson(person)}
                                  >
                                    <BrandMark name={person.name} />
                                    <span>{person.name}</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </li>
                        );
                      })
                    )
                  ) : null}
                  {browse === "banks" && banks.length === 0 ? (
                    <li className="txn-picker-empty">No banks in the catalog</li>
                  ) : null}
                  {browse === "banks"
                    ? banks.map((provider) => (
                        <li key={provider.id}>
                          <button
                            type="button"
                            className={`txn-picker-item ${bankChoice?.id === provider.id ? "active" : ""}`}
                            onClick={() => chooseApp(provider)}
                          >
                            <BrandMark name={provider.canonicalName} logoUrl={provider.logoUrl} />
                            <span>{provider.canonicalName}</span>
                          </button>
                        </li>
                      ))
                    : null}
                  {browse !== "family" && browse !== "banks"
                    ? subcategories
                        .filter((category) => {
                          const q = query.trim().toLowerCase();
                          return !q || category.label.toLowerCase().includes(q);
                        })
                        .map((category) => (
                          <li key={category.slug}>
                            <button
                              type="button"
                              className={`txn-picker-item ${txn.category === category.slug ? "active" : ""}`}
                              onClick={() => chooseSubcategory(category.slug)}
                            >
                              <BrandMark
                                name={category.label}
                                logoUrl={logoForCategory(category.slug)}
                              />
                              <span>{category.label}</span>
                            </button>
                          </li>
                        ))
                    : null}
                  {browse !== "family" &&
                  browse !== "banks" &&
                  apps.length === 0 &&
                  subcategories.length === 0 ? (
                    <li className="txn-picker-empty">
                      {browse ? "No apps in this category" : "Pick a category, or search"}
                    </li>
                  ) : browse !== "family" && browse !== "banks" ? (
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
                  ) : null}
                </ul>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
