"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CategorySummary } from "@/types";
import { logoForCategory } from "@/helpers/apps";
import { BrandMark } from "@/components/BrandMark";

interface CategoryMenuProps {
  categories: CategorySummary[];
  value: string;
  onChange: (slug: string) => void;
}

export function CategoryMenu({ categories, value, onChange }: CategoryMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [box, setBox] = useState({ top: 0, left: 0, width: 280 });
  const rootRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const parents = categories
    .filter((category) => !category.meta?.parent)
    .sort((a, b) => a.label.localeCompare(b.label));
  const current =
    value === "all" ? "All categories" : (categories.find((category) => category.slug === value)?.label ?? "Category");

  useEffect(() => {
    setMounted(true);
  }, []);

  function place() {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, 280);
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }
    setBox({ top: rect.bottom + 8, left, width });
  }

  useEffect(() => {
    if (!open) return;
    place();
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || popRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  function choose(slug: string) {
    onChange(slug);
    setOpen(false);
  }

  return (
    <div className="menu-select" ref={rootRef}>
      <button
        type="button"
        className="menu-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        <span>{current}</span>
        <i aria-hidden />
      </button>
      {open && mounted
        ? createPortal(
        <div
          ref={popRef}
          className="menu-select-pop"
          role="listbox"
          aria-label="Filter by category"
          style={{ top: box.top, left: box.left, width: box.width }}
        >
          <button
            type="button"
            className={`menu-select-item${value === "all" ? " active" : ""}`}
            onClick={() => choose("all")}
          >
            All categories
          </button>
          {parents.map((parent) => {
            const children = categories
              .filter((category) => category.meta?.parent === parent.slug)
              .sort((a, b) => a.sortOrder - b.sortOrder);
            return (
              <div key={parent.slug} className="menu-select-group">
                <button
                  type="button"
                  className={`menu-select-item${value === parent.slug ? " active" : ""}`}
                  onClick={() => choose(parent.slug)}
                >
                  <BrandMark name={parent.label} logoUrl={logoForCategory(parent.slug)} size={18} />
                  {parent.label}
                </button>
                {children.map((child) => (
                  <button
                    key={child.slug}
                    type="button"
                    className={`menu-select-item child${value === child.slug ? " active" : ""}`}
                    onClick={() => choose(child.slug)}
                  >
                    <BrandMark name={child.label} logoUrl={logoForCategory(child.slug)} size={18} />
                    {child.label}
                  </button>
                ))}
              </div>
            );
          })}
        </div>,
        document.body,
      )
        : null}
    </div>
  );
}
