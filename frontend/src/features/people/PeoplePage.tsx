"use client";

import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { useApi } from "@/lib/useApi";
import { mergeFamilyPeople } from "@/helpers/finance";
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

function buildRuleMatchFields(matchText: string): {
  matchNarrationRe?: string;
  matchUpiId?: string;
} {
  const trimmed = matchText.trim();
  if (trimmed.includes("@")) return { matchUpiId: trimmed.toLowerCase() };
  return { matchNarrationRe: trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") };
}

function personGroup(tags: unknown): PersonGroup | null {
  if (!Array.isArray(tags)) return null;
  const found = tags.find(
    (tag) => tag === "friend" || tag === "family" || tag === "office",
  );
  return found ?? null;
}

export function PeoplePage() {
  const { data, refresh } = useDashboard();
  const api = useApi();
  const [rules, setRules] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState("");
  const [matchText, setMatchText] = useState("");
  const [group, setGroup] = useState<PersonGroup>("friend");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadRules = useCallback(async () => {
    if (!api) return;
    const res = await api.listRules();
    setRules(res.rules);
  }, [api]);

  useEffect(() => {
    void loadRules().catch(() => {
      setError("Could not load people");
    });
  }, [loadRules]);

  if (!data) return null;

  const people = mergeFamilyPeople(data.payeeSpend ?? [], data.transactions ?? []);
  const groupByName = new Map<string, PersonGroup>();
  for (const rule of rules) {
    const payee = typeof rule.setPayeeName === "string" ? rule.setPayeeName : "";
    if (!payee) continue;
    groupByName.set(payee.toLowerCase(), personGroup(rule.setTags) ?? "family");
  }

  const grouped = new Map<PersonGroup, PayeeSpend[]>(
    PERSON_GROUPS.map((item) => [item.id, []]),
  );
  for (const person of people) {
    const assigned = groupByName.get(person.name.toLowerCase()) ?? "family";
    grouped.get(assigned)?.push(person);
  }

  return (
    <div className="view-stack">
      <LedgerlineFadeContent>
        <Panel>
          <PanelHead
            title="Add a person"
            subtitle="Match a name to a UPI id or words in the narration. They stay on this page."
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
                  ...buildRuleMatchFields(match),
                  setPayeeName: person,
                  setTags: [group],
                  ...(group === "family" ? { setCategorySlug: "family" } : {}),
                });
                setName("");
                setMatchText("");
                await loadRules();
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
          />
        </LedgerlineFadeContent>
      ))}
    </div>
  );
}
