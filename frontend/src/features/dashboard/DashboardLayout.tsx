"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
import { currentMonth } from "@/lib/month";
import {
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
    hasData,
    refresh,
    goToImport,
    fetchError,
  } = useDashboard();

  const view = viewFromPath(pathname) ?? "overview";

  const navigate = useCallback(
    (next: DashboardView) => {
      router.push(pathForView(next));
    },
    [router],
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
      hasData={hasData}
      userEmail={user?.email}
      fetchError={fetchError}
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
