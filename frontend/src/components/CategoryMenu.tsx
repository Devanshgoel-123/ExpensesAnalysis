"use client";

import { useEffect, useRef, useState } from "react";
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
  const rootRef = useRef<HTMLDivElement>(null);
  const parents = categories
    .filter((category) => !category.meta?.parent)
    .sort((a, b) => a.label.localeCompare(b.label));
  const current =
    value === "all" ? "All categories" : (categories.find((category) => category.slug === value)?.label ?? "Category");

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
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
      {open ? (
        <div className="menu-select-pop" role="listbox" aria-label="Filter by category">
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
        </div>
      ) : null}
    </div>
  );
}
