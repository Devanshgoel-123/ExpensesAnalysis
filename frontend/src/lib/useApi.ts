"use client";

import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { createApiClient, type ApiClient } from "@/lib/api/client";

/**
 * Returns an authenticated API client for the current session, or null while logged out.
 */
export function useApi(): ApiClient | null {
  const { token } = useAuth();
  return useMemo(
    () => (token ? createApiClient(token) : null),
    [token],
  );
}
