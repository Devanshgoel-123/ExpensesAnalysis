import { Router } from "express";
import { requireAuth } from "../auth/service.js";
import { getStore } from "../db/index.js";

export const rulesRouter = Router();
rulesRouter.use(requireAuth);

rulesRouter.get("/", async (req, res) => {
  const store = await getStore();
  const rules = await store.listRules(req.user!.id);
  res.json({ rules });
});

rulesRouter.post("/", async (req, res) => {
  const store = await getStore();
  const body = req.body ?? {};
  const rule = await store.createRule({
    userId: req.user!.id,
    name: String(body.name ?? "Custom rule"),
    priority: Number(body.priority ?? 50),
    enabled: body.enabled !== false,
    matchNarrationRe:
      typeof body.matchNarrationRe === "string" ? body.matchNarrationRe : null,
    matchUpiId: typeof body.matchUpiId === "string" ? body.matchUpiId : null,
    matchMerchantAlias:
      typeof body.matchMerchantAlias === "string"
        ? body.matchMerchantAlias
        : null,
    matchAmountMin:
      body.matchAmountMin == null ? null : Number(body.matchAmountMin),
    matchAmountMax:
      body.matchAmountMax == null ? null : Number(body.matchAmountMax),
    matchType:
      body.matchType === "debit" || body.matchType === "credit"
        ? body.matchType
        : null,
    setProviderId:
      typeof body.setProviderId === "string" ? body.setProviderId : null,
    setPayeeName:
      typeof body.setPayeeName === "string" ? body.setPayeeName : null,
    setCategorySlug:
      typeof body.setCategorySlug === "string" ? body.setCategorySlug : null,
    setTags: Array.isArray(body.setTags) ? body.setTags.map(String) : [],
  });
  await store.audit(req.user!.id, "rule.created", { ruleId: rule.id });
  res.status(201).json({ rule });
});

rulesRouter.delete("/:id", async (req, res) => {
  const store = await getStore();
  await store.deleteRule(req.user!.id, req.params.id);
  await store.audit(req.user!.id, "rule.deleted", { ruleId: req.params.id });
  res.json({ ok: true });
});

rulesRouter.get("/suggestions", async (req, res) => {
  const store = await getStore();
  const txs = await store.listTransactions(req.user!.id);
  const counts = new Map<string, { label: string; count: number; sample: string }>();
  for (const tx of txs) {
    const key = (tx.upiId || tx.merchant || tx.payee || tx.description.slice(0, 32)).toLowerCase();
    if (!key) continue;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else {
      counts.set(key, {
        label: tx.payee || tx.merchant || tx.upiId || tx.description.slice(0, 40),
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
