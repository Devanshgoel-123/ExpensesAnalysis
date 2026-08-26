"use client";

import { LoginLoading } from "@/components/LoginLoading";
import { LoginPage } from "@/components/LoginPage";
import { useAuth } from "@/lib/auth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, authError } = useAuth();

  if (loading) {
    return <LoginLoading />;
  }

  if (user) return <>{children}</>;

  return <LoginPage authError={authError} />;
}
