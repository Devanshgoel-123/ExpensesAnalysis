import type { Metadata } from "next";
import { NotFoundView } from "@/components/NotFoundView";

export const metadata: Metadata = {
  title: "404 — Ledgerline",
  description: "This page does not exist in Ledgerline.",
};

export default function NotFound() {
  return <NotFoundView />;
}
