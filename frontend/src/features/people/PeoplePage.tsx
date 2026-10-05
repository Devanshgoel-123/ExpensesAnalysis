"use client";

import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { useApi } from "@/lib/useApi";
import { peopleFromTransactions } from "@/helpers/finance";
import { PayeeSpendPanel } from "@/components/PayeeSpendPanel";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";
import { Panel, PanelHead } from "@/components/ui/Panel";
import type { PayeeSpend } from "@/types";

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
  const { refresh, data: ledger, periodLabel } = useDashboard();
  const api = useApi();
  const [rules, setRules] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState("");
  const [matchText, setMatchText] = useState("");
  const [group, setGroup] = useState<PersonGroup>("friend");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingName, setRemovingName] = useState<string | null>(null);
  const [removingUpi, setRemovingUpi] = useState<string | null>(null);

  const loadPeople = useCallback(async () => {
    if (!api) return;
    const res = await api.listRules();
    setRules(res.rules);
  }, [api]);

  useEffect(() => {
    void Promise.resolve().then(loadPeople).catch(() => {
      setError("Could not load people");
    });
  }, [loadPeople]);

  if (!ledger) return null;

  const groupByName = new Map<string, PersonGroup>();
  const ruleNames: string[] = [];
  const trackedUpis = new Map<string, string[]>();
  for (const rule of rules) {
    const payee = typeof rule.setPayeeName === "string" ? rule.setPayeeName : "";
    if (!payee) continue;
    const tags = Array.isArray(rule.setTags) ? rule.setTags : [];
    if (tags.includes("upi-block")) continue;
    ruleNames.push(payee);
    groupByName.set(payee.toLowerCase(), personGroup(tags) ?? "family");
    const upi = typeof rule.matchUpiId === "string" ? rule.matchUpiId : "";
    if (!upi) continue;
    const key = payee.toLowerCase();
    const list = trackedUpis.get(key) ?? [];
    if (!list.some((id) => id.toLowerCase() === upi.toLowerCase())) list.push(upi);
    trackedUpis.set(key, list);
  }

  const { people, paymentsByName } = peopleFromTransactions(
    [...ruleNames, ...(ledger.payeeSpend ?? []).map((item) => item.name)],
    ledger.transactions ?? [],
  );
  const grouped = new Map<PersonGroup, PayeeSpend[]>(
    PERSON_GROUPS.map((item) => [item.id, []]),
  );
  const detailByName: Record<string, string[]> = {};
  for (const person of people) {
    const key = person.name.toLowerCase();
    grouped.get(groupByName.get(key) ?? "family")?.push(person);
    const upiIds = [
      ...new Set([
        ...(trackedUpis.get(key) ?? []),
        ...(paymentsByName[key] ?? []).flatMap((payment) =>
          payment.upiId ? [payment.upiId] : [],
        ),
      ]),
    ];
    if (upiIds.length > 0) detailByName[key] = upiIds;
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
                  setCategorySlug: "family",
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
                : `${grouped.get(item.id)?.length} ${item.label.toLowerCase()} · ${periodLabel}`
            }
            items={grouped.get(item.id) ?? []}
            paymentsByName={paymentsByName}
            detailByName={detailByName}
            removingName={removingName}
            removingUpi={removingUpi}
            onRemoveUpi={
              item.id === "office"
                ? undefined
                : async (person, upiId) => {
                    if (!api || removingUpi) return;
                    setRemovingUpi(`${person}\0${upiId}`);
                    setError(null);
                    try {
                      const result = await api.detachPersonUpi({ name: person, upiId });
                      await loadPeople();
                      refresh();
                      setMessage(
                        result.cleared > 0
                          ? `${upiId} is no longer tracked as ${person}. ${result.cleared} payment${result.cleared === 1 ? "" : "s"} unlabeled.`
                          : `${upiId} is no longer tracked as ${person}.`,
                      );
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : "Could not remove that UPI id",
                      );
                    } finally {
                      setRemovingUpi(null);
                    }
                  }
            }
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
