"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginLoading } from "@/components/LoginLoading";
import { LoginPage } from "@/components/LoginPage";
import { useAuth } from "@/lib/auth";
import { createApiClient } from "@/lib/api/client";
import { pathForView } from "@/lib/dashboardViews";

/**
 * App entry bootstrap: wait for auth, then send empty accounts to Import
 * and accounts with data to Overview.
 */
export default function HomePage() {
  const { user, token, loading, authError, clearAuthError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user || !token) return;
    let cancelled = false;
    void Promise.resolve().then(async () => {
      try {
        const status = await createApiClient(token).fetchImportStatus();
        if (cancelled) return;
        router.replace(
          status.hasTransactions
            ? pathForView("overview")
            : pathForView("import"),
        );
      } catch {
        if (!cancelled) router.replace(pathForView("import"));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loading, user, token, router]);

  if (loading) {
    return <LoginLoading />;
  }

  if (!user) {
    return (
      <LoginPage
        authError={authError}
        onContinue={clearAuthError}
      />
    );
  }

  return <LoginLoading text="Opening your ledger…" />;
}
