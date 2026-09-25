"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
import { currentMonth } from "@/helpers/month";
import {
  DATA_OPTIONAL_VIEWS,
  pathForView,
  viewFromPath,
  type DashboardView,
} from "@/lib/dashboardViews";
import { useAuth } from "@/lib/auth";

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const {
    month,
    setMonth,
    periodLabel,
    hasAnyData,
    hasMonthData,
    refresh,
    goToImport,
    fetchError,
    mailScan,
    importStatus,
    fetching,
  } = useDashboard();

  const view = viewFromPath(pathname) ?? "overview";

  // First-run: keep empty accounts on Import (and Settings / Daily Limit).
  useEffect(() => {
    if (fetching && importStatus === null) return;
    if (hasAnyData) return;
    if (DATA_OPTIONAL_VIEWS.includes(view)) return;
    router.replace(pathForView("import"));
  }, [fetching, importStatus, hasAnyData, view, router]);

  const navigate = useCallback(
    (next: DashboardView) => {
      if (!hasAnyData && !DATA_OPTIONAL_VIEWS.includes(next)) {
        router.push(pathForView("import"));
        return;
      }
      router.push(pathForView(next));
    },
    [router, hasAnyData],
  );

  const monthControl = (
    <label className="field field-inline">
      <span className="meta">Month</span>
      <input
        type="month"
        value={month}
        onChange={(e) => setMonth(e.target.value || currentMonth())}
      />
    </label>
  );

  return (
    <AppShell
      view={view}
      onNavigate={navigate}
      periodLabel={periodLabel}
      monthControl={monthControl}
      hasData={hasMonthData}
      hasAnyData={hasAnyData}
      userEmail={user?.email}
      fetchError={DATA_OPTIONAL_VIEWS.includes(view) ? fetchError : null}
      mailScan={mailScan}
      onImportAnother={goToImport}
      onRefresh={refresh}
      onLogout={logout}
    >
      {children}
    </AppShell>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <DashboardProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </DashboardProvider>
    </AuthGate>
  );
}
