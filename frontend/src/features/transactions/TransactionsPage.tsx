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
      setAssigningId(txn.id);
      try {
        await api.correctTransaction(txn.id, patch);
        refresh();
      } finally {
        setAssigningId(null);
      }
    },
    [api, refresh],
  );

  if (!data) return null;

  return (
    <LedgerlineFadeContent className="txn-fill">
      <TransactionTable
        items={data.transactions}
        categories={data.categories ?? []}
        providers={providers}
        assigningId={assigningId}
        onAssign={onAssign}
      />
    </LedgerlineFadeContent>
  );
}
