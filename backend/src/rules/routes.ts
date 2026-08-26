import { Router } from "express";
import { requireAuth } from "../auth/service.js";
import { getStore } from "../db/index.js";
import { validate } from "../middleware/validate.js";
import { uuidParamSchema } from "../validators/common.js";
import { createRuleBodySchema } from "../validators/rules.js";
import { matchRule } from "./engine.js";

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
      classificationSource: `rule:${rule.id}`,
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
