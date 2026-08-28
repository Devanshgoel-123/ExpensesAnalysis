"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** @deprecated Use URL routes under /(dashboard). Redirects legacy imports. */
export function Dashboard() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/overview");
  }, [router]);
  return null;
}
