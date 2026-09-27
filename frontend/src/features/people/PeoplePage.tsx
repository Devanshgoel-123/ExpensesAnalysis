"use client";

import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { useApi } from "@/lib/useApi";
import { mergeFamilyPeople } from "@/helpers/finance";
import { PayeeSpendPanel } from "@/components/PayeeSpendPanel";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";
import { Panel, PanelHead } from "@/components/ui/Panel";
import type { ParseResult, PayeeSpend } from "@/types";

const PERSON_GROUPS = [
  { id: "friend", label: "Friends", blurb: "People you pay outside home and work" },
  { id: "family", label: "Family", blurb: "Home, parents, and family" },
  { id: "office", label: "Office", blurb: "People you pay at work" },
] as const;

type PersonGroup = (typeof PERSON_GROUPS)[number]["id"];

function buildRuleMatchFields(name: string, matchText: string): {
  matchNarrationRe?: string;
  matchUpiId?: string;
} {
  const match = matchText.trim();
  const person = name.trim();
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (match.includes("@")) {
    return {
      matchUpiId: match.toLowerCase(),
      ...(person && !person.includes("@") ? { matchNarrationRe: escape(person) } : {}),
    };
  }
  const parts = [...new Set([person, match].map((value) => value.toLowerCase()).filter(Boolean))];
  return { matchNarrationRe: parts.map(escape).join("|") };
}

function personGroup(tags: unknown): PersonGroup | null {
  if (!Array.isArray(tags)) return null;
  const found = tags.find(
    (tag) => tag === "friend" || tag === "family" || tag === "office",
  );
  return found ?? null;
}

export function PeoplePage() {
  const { refresh } = useDashboard();
  const api = useApi();
  const [ledger, setLedger] = useState<ParseResult | null>(null);
  const [rules, setRules] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState("");
  const [matchText, setMatchText] = useState("");
  const [group, setGroup] = useState<PersonGroup>("friend");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingName, setRemovingName] = useState<string | null>(null);

  const loadPeople = useCallback(async () => {
    if (!api) return;
    const [res, allMonths] = await Promise.all([
      api.listRules(),
      api.fetchDashboard(),
    ]);
    setRules(res.rules);
    setLedger(allMonths);
  }, [api]);

  useEffect(() => {
    void loadPeople().catch(() => {
      setError("Could not load people");
    });
  }, [loadPeople]);

  if (!ledger) return null;

  const people = mergeFamilyPeople(ledger.payeeSpend ?? [], ledger.transactions ?? []);
  const groupByName = new Map<string, PersonGroup>();
  for (const rule of rules) {
    const payee = typeof rule.setPayeeName === "string" ? rule.setPayeeName : "";
    if (!payee) continue;
    groupByName.set(payee.toLowerCase(), personGroup(rule.setTags) ?? "family");
  }

  const grouped = new Map<PersonGroup, PayeeSpend[]>(
    PERSON_GROUPS.map((item) => [item.id, []]),
  );
  const paymentsByName: Record<string, { date: string; amount: number; direction: "paid" | "received" }[]> = {};
  const detailByName: Record<string, string> = {};
  const txns = ledger.transactions ?? [];
  for (const person of people) {
    const assigned = groupByName.get(person.name.toLowerCase()) ?? "family";
    grouped.get(assigned)?.push(person);
    const rule = rules.find(
      (item) =>
        typeof item.setPayeeName === "string" &&
        item.setPayeeName.toLowerCase() === person.name.toLowerCase(),
    );
    const needle =
      (typeof rule?.matchUpiId === "string" && rule.matchUpiId) ||
      (typeof rule?.matchNarrationRe === "string" && rule.matchNarrationRe) ||
      "";
    const matched = txns.filter((txn) => {
      if (txn.type !== "debit" && txn.type !== "credit") return false;
      if (txn.payee?.toLowerCase() === person.name.toLowerCase()) return true;
      if (!needle) return false;
      const hay = `${txn.description} ${txn.upiId ?? ""} ${txn.merchant ?? ""}`;
      try {
        return new RegExp(needle, "i").test(hay);
      } catch {
        return hay.toLowerCase().includes(needle.toLowerCase());
      }
    });
    paymentsByName[person.name.toLowerCase()] = matched
      .map((txn) => ({
        date: txn.date,
        amount: txn.amount,
        direction: txn.type === "credit" ? ("received" as const) : ("paid" as const),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    const upi = matched.find((txn) => txn.upiId)?.upiId;
    if (upi) detailByName[person.name.toLowerCase()] = upi;
  }

  return (
    <div className="view-stack">
      <LedgerlineFadeContent>
        <Panel>
          <PanelHead
            title="Add a person"
            subtitle="Matches the UPI id or narration on payments already saved from mail or a statement, across every month."
          />
          {error ? <p className="form-error">{error}</p> : null}
          {message ? <p className="meta">{message}</p> : null}
          <form
            className="people-add"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!api) return;
              const person = name.trim();
              const match = matchText.trim();
              if (!person) {
                setError("Enter a name");
                return;
              }
              if (!match) {
                setError("Enter a UPI id or narration text");
                return;
              }
              setSaving(true);
              setError(null);
              try {
                const result = await api.createRule({
                  name: `Track ${person}`,
                  priority: 20,
                  ...buildRuleMatchFields(person, match),
                  setPayeeName: person,
                  setTags: [group],
                  ...(group === "family" ? { setCategorySlug: "family" } : {}),
                });
                setName("");
                setMatchText("");
                await loadPeople();
                refresh();
                const count =
                  typeof result.reclassified === "number" ? result.reclassified : 0;
                setMessage(
                  count > 0
                    ? `${person} saved. ${count} payment${count === 1 ? "" : "s"} matched.`
                    : `${person} saved.`,
                );
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not save that person");
              } finally {
                setSaving(false);
              }
            }}
          >
            <label className="field">
              <span>Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Aryan"
              />
            </label>
            <label className="field">
              <span>UPI id or narration</span>
              <input
                value={matchText}
                onChange={(event) => setMatchText(event.target.value)}
                placeholder="aryan@okicici"
              />
            </label>
            <label className="field">
              <span>Group</span>
              <select
                value={group}
                onChange={(event) => setGroup(event.target.value as PersonGroup)}
              >
                {PERSON_GROUPS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="cta" disabled={saving || !api}>
              {saving ? "Saving…" : "Add person"}
            </button>
          </form>
        </Panel>
      </LedgerlineFadeContent>

      {PERSON_GROUPS.map((item) => (
        <LedgerlineFadeContent key={item.id}>
          <PayeeSpendPanel
            title={item.label}
            subtitle={
              (grouped.get(item.id)?.length ?? 0) === 0
                ? item.blurb
                : `${grouped.get(item.id)?.length} ${item.label.toLowerCase()}`
            }
            items={grouped.get(item.id) ?? []}
            paymentsByName={paymentsByName}
            detailByName={detailByName}
            removingName={removingName}
            onRemove={
              item.id === "office"
                ? undefined
                : async (person) => {
                    if (!api || removingName) return;
                    const ok = window.confirm(
                      `Remove ${person} from ${item.label}? Their payments stay in the ledger.`,
                    );
                    if (!ok) return;
                    setRemovingName(person);
                    setError(null);
                    try {
                      const result = await api.untrackPerson(person);
                      await loadPeople();
                      refresh();
                      setMessage(
                        result.cleared > 0
                          ? `${person} removed. ${result.cleared} payment${result.cleared === 1 ? "" : "s"} unlabeled.`
                          : `${person} removed.`,
                      );
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Could not remove that person");
                    } finally {
                      setRemovingName(null);
                    }
                  }
            }
          />
        </LedgerlineFadeContent>
      ))}
    </div>
  );
}
