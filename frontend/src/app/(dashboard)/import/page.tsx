"use client";

import { Suspense } from "react";
import { ImportPage } from "@/features/imports/ImportPage";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ImportRoute() {
  return (
    <Suspense fallback={<LoadingState text="Loading import" variant="skeleton" />}>
      <ImportPage />
    </Suspense>
  );
}
