"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { useApi } from "@/lib/useApi";
import { pathForView } from "@/lib/dashboardViews";
import type { Provider } from "@/lib/api/types";
import {
  dayCategoryMix,
  groupAppsByCategory,
  logoForAppName,
} from "@/helpers/apps";
import { formatInr } from "@/helpers/currency";
import { formatMonthTitle } from "@/helpers/finance";
import { BrandMark } from "@/components/BrandMark";
import { DayCategoryBar } from "@/components/DayCategoryBar";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";
import { Panel, PanelHead } from "@/components/ui/Panel";
import { LoadingState } from "@/components/ui/LoadingState";

export function AppsPage() {
  const { data, month, fetching, refresh } = useDashboard();
  const api = useApi();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [name, setName] = useState("");
  const [categorySlug, setCategorySlug] = useState("food");
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadProviders = useCallback(async () => {
    if (!api) return;
    const res = await api.listProviders();
    setProviders(res.providers);
  }, [api]);

  useEffect(() => {
    void loadProviders().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load apps");
    });
  }, [loadProviders]);

  const groups = useMemo(
    () =>
      groupAppsByCategory(
        providers,
        data?.transactions ?? [],
        data?.categories ?? [],
      ),
    [providers, data],
  );

  const latestDay = data?.transactions[0]?.date ?? null;
  const todayMix = useMemo(() => {
    if (!data || !latestDay) return null;
    return dayCategoryMix(data.transactions, data.categories ?? [], latestDay);
  }, [data, latestDay]);

  if (fetching && !data) {
    return <LoadingState text="Loading apps" variant="skeleton" />;
  }
  if (!data) return null;

  return (
    <div className="view-stack">
      <LedgerlineFadeContent>
        <header>
          <p className="stat-kicker mb-2">Apps</p>
          <h2 className="month-label">{formatMonthTitle(month)}</h2>
          <p className="meta mt-1.5">
            Move an app between categories here. To capture per-vendor totals,
            open{" "}
            <Link
              href={pathForView("transactions")}
              className="text-[var(--primary)] underline-offset-2 hover:underline"
            >
              Transactions
            </Link>{" "}
            and set Category + App on each spend.
          </p>
        </header>
      </LedgerlineFadeContent>

      {todayMix && todayMix.total > 0 ? (
        <LedgerlineFadeContent delay={40}>
          <Panel>
            <PanelHead
              title={`Mix on ${latestDay}`}
              subtitle="Each color is that category’s share of the day’s debit total"
            />
            <DayCategoryBar mix={todayMix} />
          </Panel>
        </LedgerlineFadeContent>
      ) : null}

      {groups.map((group, index) => (
        <LedgerlineFadeContent key={group.slug} delay={80 + index * 40}>
          <Panel>
            <PanelHead
              title={group.label}
              subtitle={`${group.apps.length} app${group.apps.length === 1 ? "" : "s"}`}
            />
            {group.apps.length === 0 ? (
              <p className="meta">No apps in this category yet</p>
            ) : (
              <div className="apps-grid">
                {group.apps.map(({ provider, total, count }) => (
                  <article key={provider.id} className="app-card">
                    <BrandMark
                      name={provider.canonicalName}
                      logoUrl={provider.logoUrl}
                      size={36}
                    />
                    <strong>{provider.canonicalName}</strong>
                    <p className="meta">
                      {count > 0
                        ? `${formatInr(total)} · ${count} txn${count === 1 ? "" : "s"}`
                        : "No tagged spend yet"}
                    </p>
                    <label className="field">
                      <span>Category</span>
                      <select
                        value={provider.categorySlug ?? ""}
                        onChange={async (event) => {
                          if (!api || !provider.id) return;
                          const next = event.target.value;
                          try {
                            setError(null);
                            await api.patchProvider(provider.id, {
                              categorySlug: next,
                            });
                            await loadProviders();
                            refresh();
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Could not move app",
                            );
                          }
                        }}
                      >
                        {(data.categories ?? []).map((category) => (
                          <option key={category.slug} value={category.slug}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))}
              </div>
            )}
          </Panel>
        </LedgerlineFadeContent>
      ))}

      <LedgerlineFadeContent delay={200}>
        <Panel>
          <PanelHead
            title="Add an app"
            subtitle="New vendors show up here and in the transaction pickers"
          />
          {message ? <p className="meta">{message}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          <form
            className="apps-add"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!api) return;
              const trimmed = name.trim();
              if (!trimmed) {
                setError("Enter an app name");
                return;
              }
              try {
                setError(null);
                await api.createProvider({
                  canonicalName: trimmed,
                  categorySlug,
                  aliases: [trimmed],
                  logoUrl: logoForAppName(trimmed),
                });
                setName("");
                setMessage(`${trimmed} added`);
                await loadProviders();
                refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not add app");
              }
            }}
          >
            <label className="field">
              <span>Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Zepto"
              />
            </label>
            <label className="field">
              <span>Category</span>
              <select
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
              >
                {(data.categories ?? []).map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="cta">
              Add app
            </button>
          </form>
        </Panel>
      </LedgerlineFadeContent>

      <LedgerlineFadeContent delay={240}>
        <Panel>
          <PanelHead
            title="Add a category"
            subtitle="Healthcare and Family are already there. Add your own when a spend does not fit."
          />
          <form
            className="apps-add"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!api) return;
              const trimmed = newCategory.trim();
              if (!trimmed) {
                setError("Enter a category name");
                return;
              }
              try {
                setError(null);
                const res = await api.createCategory({ label: trimmed });
                setNewCategory("");
                setCategorySlug(res.category.slug);
                setMessage(`${res.category.label} category added`);
                refresh();
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Could not add category",
                );
              }
            }}
          >
            <label className="field">
              <span>Category name</span>
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Pets"
              />
            </label>
            <button type="submit" className="cta">
              Add category
            </button>
          </form>
        </Panel>
      </LedgerlineFadeContent>
    </div>
  );
}
