import { Router } from "express";
import { requireAuth } from "../auth/service.js";
import { getStore } from "../db/index.js";
import { validate } from "../middleware/validate.js";
import { uuidParamSchema } from "../validators/common.js";
import { createRuleBodySchema } from "../validators/rules.js";
import { matchRule } from "./engine.js";
import { ruleClassificationSource } from "../enums/index.js";

export const rulesRouter = Router();
rulesRouter.use(requireAuth);

rulesRouter.get("/", async (req, res) => {
  const store = await getStore();
  const rules = await store.listRules(req.user!.id);
  res.json({ rules });
});

rulesRouter.post("/", validate(createRuleBodySchema), async (req, res) => {
  const store = await getStore();
  const body = req.body as {
    name: string;
    priority: number;
    enabled: boolean;
    matchNarrationRe?: string | null;
    matchUpiId?: string | null;
    matchMerchantAlias?: string | null;
    matchAmountMin?: number | null;
    matchAmountMax?: number | null;
    matchType?: "debit" | "credit" | null;
    setProviderId?: string | null;
    setPayeeName?: string | null;
    setCategorySlug?: string | null;
    setTags: string[];
  };
  const rule = await store.createRule({
    userId: req.user!.id,
    name: body.name,
    priority: body.priority,
    enabled: body.enabled,
    matchNarrationRe: body.matchNarrationRe ?? null,
    matchUpiId: body.matchUpiId ?? null,
    matchMerchantAlias: body.matchMerchantAlias ?? null,
    matchAmountMin: body.matchAmountMin ?? null,
    matchAmountMax: body.matchAmountMax ?? null,
    matchType: body.matchType ?? null,
    setProviderId: body.setProviderId ?? null,
    setPayeeName: body.setPayeeName ?? null,
    setCategorySlug: body.setCategorySlug ?? null,
    setTags: body.setTags,
  });

  const reclassified = await store.reclassifyByRule(
    req.user!.id,
    (candidate) => matchRule(rule, candidate),
    {
      payee: rule.setPayeeName ?? undefined,
      merchant: undefined,
      categorySlug: rule.setCategorySlug ?? undefined,
      providerId: rule.setProviderId ?? undefined,
      classificationSource: ruleClassificationSource(rule.id),
    },
  );

  await store.audit(req.user!.id, "rule.created", {
    ruleId: rule.id,
    reclassified,
  });
  res.status(201).json({ rule, reclassified });
});

rulesRouter.get("/suggestions", async (req, res) => {
  const store = await getStore();
  const txs = await store.listTransactions(req.user!.id);
  const counts = new Map<
    string,
    { label: string; count: number; sample: string }
  >();
  for (const tx of txs) {
    const key = (
      tx.upiId ||
      tx.merchant ||
      tx.payee ||
      tx.description.slice(0, 32)
    ).toLowerCase();
    if (!key) continue;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else {
      counts.set(key, {
        label:
          tx.payee || tx.merchant || tx.upiId || tx.description.slice(0, 40),
        count: 1,
        sample: tx.description,
      });
    }
  }
  const suggestions = [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
  res.json({ suggestions });
});

rulesRouter.post("/attach-upi", async (req, res) => {
  const name = String((req.body as { name?: string }).name ?? "").trim();
  const upiId = String((req.body as { upiId?: string }).upiId ?? "")
    .trim()
    .toLowerCase();
  if (!name || !upiId.includes("@")) {
    res.status(400).json({ error: { message: "Name and UPI id are required" } });
    return;
  }
  const store = await getStore();
  const rules = await store.listRules(req.user!.id);
  const owned = rules.filter(
    (rule) => rule.setPayeeName?.toLowerCase() === name.toLowerCase(),
  );
  if (owned.length === 0) {
    res.status(404).json({ error: { message: "That person is not in your list" } });
    return;
  }
  const already = owned.some((rule) => rule.matchUpiId?.toLowerCase() === upiId);
  if (already) {
    res.json({ ok: true, attached: false });
    return;
  }
  const open = owned.find((rule) => !rule.matchUpiId);
  let rule = open ?? null;
  if (open) {
    rule = await store.updateRuleMatchUpi(req.user!.id, open.id, upiId);
  } else {
    const sample = owned[0]!;
    rule = await store.createRule({
      userId: req.user!.id,
      name: sample.name,
      priority: sample.priority,
      enabled: true,
      matchNarrationRe: null,
      matchUpiId: upiId,
      matchMerchantAlias: null,
      matchAmountMin: null,
      matchAmountMax: null,
      matchType: null,
      setProviderId: sample.setProviderId,
      setPayeeName: sample.setPayeeName,
      setCategorySlug: sample.setCategorySlug ?? "family",
      setTags: sample.setTags,
    });
  }
  if (rule) {
    await store.reclassifyByRule(
      req.user!.id,
      (candidate) =>
        candidate.classificationSource !== "user_override" && matchRule(rule!, candidate),
      {
        payee: rule.setPayeeName ?? undefined,
        categorySlug: rule.setCategorySlug ?? undefined,
        providerId: rule.setProviderId ?? undefined,
        classificationSource: ruleClassificationSource(rule.id),
      },
    );
  }
  await store.audit(req.user!.id, "person.upi_attached", { name, upiId });
  res.json({ ok: true, attached: true });
});

rulesRouter.post("/untrack", async (req, res) => {
  const name = String((req.body as { name?: string }).name ?? "").trim();
  if (!name) {
    res.status(400).json({ error: { message: "Enter a name" } });
    return;
  }
  const store = await getStore();
  const lower = name.toLowerCase();
  const rules = await store.listRules(req.user!.id);
  const matched = rules.filter((rule) => {
    if (rule.setPayeeName?.toLowerCase() !== lower) return false;
    return (
      rule.setTags.includes("friend") ||
      rule.setTags.includes("family") ||
      rule.setCategorySlug === "family"
    );
  });
  const txs = await store.listTransactions(req.user!.id);
  let cleared = 0;
  for (const tx of txs) {
    const payeeMatch = tx.payee?.toLowerCase() === lower;
    const familyMatch =
      tx.categorySlug === "family" &&
      (tx.payee?.toLowerCase() === lower || tx.merchant?.toLowerCase() === lower);
    if (!payeeMatch && !familyMatch) continue;
    await store.updateTransaction(req.user!.id, tx.id, {
      ...(payeeMatch ? { payee: null } : {}),
      ...(tx.categorySlug === "family" ? { categorySlug: null } : {}),
    });
    cleared += 1;
  }
  for (const rule of matched) {
    await store.deleteRule(req.user!.id, rule.id);
  }
  await store.audit(req.user!.id, "person.removed", {
    name,
    removedRules: matched.length,
    cleared,
  });
  res.json({ ok: true, removedRules: matched.length, cleared });
});

rulesRouter.delete(
  "/:id",
  validate(uuidParamSchema, "params"),
  async (req, res) => {
    const store = await getStore();
    await store.deleteRule(req.user!.id, String(req.params.id));
    await store.audit(req.user!.id, "rule.deleted", {
      ruleId: String(req.params.id),
    });
    res.json({ ok: true });
  },
);
