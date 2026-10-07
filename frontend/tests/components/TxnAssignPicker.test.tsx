import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TxnAssignPicker } from "@/components/TxnAssignPicker";
import type { CategorySummary, Transaction } from "@/types";
import type { Provider } from "@/lib/api/types";

vi.mock("@/lib/useApi", () => ({ useApi: () => null }));

const categories: CategorySummary[] = [
  {
    id: "food",
    slug: "food",
    label: "Food",
    blurb: "",
    accent: "#17b061",
    sortOrder: 1,
    meta: {},
  },
  {
    id: "other",
    slug: "other",
    label: "Other",
    blurb: "",
    accent: "#888",
    sortOrder: 9,
    meta: {},
  },
];

const swiggy: Provider = {
  id: "swiggy",
  canonicalName: "Swiggy",
  aliases: ["Swiggy"],
  upiHandles: ["swiggy"],
  websiteDomain: "swiggy.com",
  logoUrl: null,
  categorySlug: "food",
  isGlobal: true,
};

function txn(patch: Partial<Transaction>): Transaction {
  return {
    id: "t1",
    date: "2026-08-01",
    time: null,
    description: "UPI",
    amount: 100,
    type: "debit",
    upiId: null,
    merchant: null,
    payee: null,
    category: "other",
    ...patch,
  };
}

afterEach(() => {
  cleanup();
});

describe("TxnAssignPicker party hint", () => {
  it("shows a business hint on an unlabeled row and leaves the picker empty", () => {
    render(
      <TxnAssignPicker
        txn={txn({ upiId: "shop@okbizaxis" })}
        categories={categories}
        providers={[]}
      />,
    );
    expect(screen.getByText("Choose app")).toBeInTheDocument();
    expect(screen.getByText("Likely a business")).toBeInTheDocument();
  });

  it("shows a person hint for a phone-shaped id", () => {
    render(
      <TxnAssignPicker
        txn={txn({ upiId: "9876543210@ybl", category: null })}
        categories={categories}
        providers={[]}
      />,
    );
    expect(screen.getByText("Likely a person")).toBeInTheDocument();
  });

  it("stays unlabeled when the handle says nothing", () => {
    render(
      <TxnAssignPicker
        txn={txn({ upiId: "friend@ybl" })}
        categories={categories}
        providers={[]}
      />,
    );
    expect(screen.getByText("Unlabeled")).toBeInTheDocument();
    expect(screen.queryByText("Likely a person")).not.toBeInTheDocument();
    expect(screen.queryByText("Likely a business")).not.toBeInTheDocument();
  });

  it("keeps a chosen category ahead of the hint", () => {
    render(
      <TxnAssignPicker
        txn={txn({ upiId: "shop@ptaxis", category: "food" })}
        categories={categories}
        providers={[]}
      />,
    );
    expect(screen.getAllByText("Food").length).toBeGreaterThan(0);
    expect(screen.queryByText("Likely a business")).not.toBeInTheDocument();
  });

  it("keeps a matched app ahead of the hint", () => {
    render(
      <TxnAssignPicker
        txn={txn({ upiId: "9876543210@okaxis", category: "food", providerId: "swiggy" })}
        categories={categories}
        providers={[swiggy]}
      />,
    );
    expect(screen.getByText("Swiggy")).toBeInTheDocument();
    expect(screen.queryByText("Likely a person")).not.toBeInTheDocument();
  });
});
