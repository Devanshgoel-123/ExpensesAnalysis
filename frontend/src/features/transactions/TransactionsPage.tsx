"use client";

import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { useApi } from "@/lib/useApi";
import type { Provider } from "@/lib/api/types";
import type { Transaction } from "@/types";
import { formatInrExact } from "@/helpers/currency";
import { TransactionTable } from "@/components/TransactionTable";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";

export function TransactionsPage() {
  const { data, refresh } = useDashboard();
  const api = useApi();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Transaction>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

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

  const onDelete = useCallback(
    async (txn: Transaction) => {
      if (!api || !txn.id || deletingId) return;
      const label = `${txn.type === "credit" ? "credit" : "debit"} of ${formatInrExact(txn.amount)}`;
      const ok = window.confirm(
        `Delete this ${label} from your ledger? This removes the record.`,
      );
      if (!ok) return;
      setAssignError(null);
      setDeletingId(txn.id);
      setDeletedIds((current) => new Set(current).add(txn.id!));
      try {
        await api.deleteTransaction(txn.id);
        refresh();
      } catch (error) {
        setDeletedIds((current) => {
          const next = new Set(current);
          next.delete(txn.id!);
          return next;
        });
        setAssignError(
          error instanceof Error ? error.message : "Could not delete that record",
        );
      } finally {
        setDeletingId(null);
      }
    },
    [api, deletingId, refresh],
  );

  const items = (data?.transactions ?? [])
    .filter((txn) => !txn.id || !deletedIds.has(txn.id))
    .map((txn) =>
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
        deletingId={deletingId}
        onDelete={onDelete}
      />
    </LedgerlineFadeContent>
  );
}
