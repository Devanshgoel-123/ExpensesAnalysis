"use client";

import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { useApi } from "@/lib/useApi";
import type { Provider } from "@/lib/api/types";
import type { Transaction } from "@/types";
import { TransactionTable } from "@/components/TransactionTable";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";

export function TransactionsPage() {
  const { data, refresh } = useDashboard();
  const api = useApi();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Transaction>>({});

  useEffect(() => {
    if (!api) return;
    void api.listProviders().then((res) => setProviders(res.providers));
  }, [api]);

  const onAssign = useCallback(
    async (
      txn: Transaction,
      patch: { categorySlug?: string; providerId?: string },
    ) => {
      if (!api || !txn.id) return;
      const provider = providers.find((item) => item.id === patch.providerId);
      const slug = patch.categorySlug ?? provider?.categorySlug ?? txn.category;
      const label =
        data?.categories?.find((category) => category.slug === slug)?.label ??
        txn.categoryLabel;
      const next: Transaction = {
        ...txn,
        category: slug,
        categoryLabel: label,
        providerId: patch.providerId ?? txn.providerId,
        merchant:
          provider && provider.categorySlug !== "banks"
            ? provider.canonicalName
            : txn.merchant,
        logoUrl:
          provider && provider.categorySlug !== "banks"
            ? provider.logoUrl
            : txn.logoUrl,
      };
      setOverrides((current) => ({ ...current, [txn.id!]: next }));
      setAssignError(null);
      setAssigningId(txn.id);
      try {
        await api.correctTransaction(txn.id, patch);
        refresh();
      } catch (error) {
        setOverrides((current) => {
          const copy = { ...current };
          delete copy[txn.id!];
          return copy;
        });
        setAssignError(
          error instanceof Error ? error.message : "Could not save that label",
        );
      } finally {
        setAssigningId(null);
      }
    },
    [api, refresh, providers, data?.categories],
  );

  const items = (data?.transactions ?? []).map((txn) =>
    txn.id && overrides[txn.id] ? { ...txn, ...overrides[txn.id] } : txn,
  );

  if (!data) return null;

  return (
    <LedgerlineFadeContent className="txn-fill">
      <TransactionTable
        items={items}
        categories={data.categories ?? []}
        providers={providers}
        assigningId={assigningId}
        assignError={assignError}
        onAssign={onAssign}
      />
    </LedgerlineFadeContent>
  );
}
