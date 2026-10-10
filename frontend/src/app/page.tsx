"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginLoading } from "@/components/LoginLoading";
import { LoginPage } from "@/components/LoginPage";
import { OnboardingWelcome } from "@/components/OnboardingWelcome";
import { useAuth } from "@/lib/auth";
import { createApiClient } from "@/lib/api/client";
import { pathForView } from "@/lib/dashboardViews";

export default function HomePage() {
  const { user, token, loading, authError, clearAuthError } = useAuth();
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    if (loading || !user || !token) return;
    let cancelled = false;
    void Promise.resolve().then(async () => {
      try {
        const status = await createApiClient(token).fetchImportStatus();
        if (cancelled) return;
        if (status.hasTransactions) {
          router.replace(pathForView("overview"));
        } else {
          setShowWelcome(true);
          setCheckingStatus(false);
        }
      } catch {
        if (!cancelled) {
          setShowWelcome(true);
          setCheckingStatus(false);
        }
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

  if (checkingStatus) {
    return <LoginLoading text="Opening your ledger…" />;
  }

  if (showWelcome) {
    return (
      <OnboardingWelcome
        onStartImport={() => router.push(pathForView("import"))}
        onTryDemo={() => {
          // TODO: Load demo data and redirect to overview
          router.push(pathForView("import"));
        }}
        onLearnMore={() => {
          // TODO: Show documentation modal or link to docs
          window.open("https://github.com/devanshgoel/ledgerline#readme", "_blank");
        }}
      />
    );
  }

  return <LoginLoading text="Opening your ledger…" />;
}
