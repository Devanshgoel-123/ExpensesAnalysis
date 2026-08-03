import { z } from "zod";

export const createRuleBodySchema = z.object({
  name: z.string().trim().min(1).max(120).default("Custom rule"),
  priority: z.coerce.number().int().min(0).max(10_000).default(50),
  enabled: z.boolean().default(true),
  matchNarrationRe: z.string().max(500).nullable().optional(),
  matchUpiId: z.string().max(200).nullable().optional(),
  matchMerchantAlias: z.string().max(200).nullable().optional(),
  matchAmountMin: z.coerce.number().nonnegative().nullable().optional(),
  matchAmountMax: z.coerce.number().nonnegative().nullable().optional(),
  matchType: z.enum(["debit", "credit"]).nullable().optional(),
  setProviderId: z.string().uuid().nullable().optional(),
  setPayeeName: z.string().max(200).nullable().optional(),
  setCategorySlug: z.string().max(64).nullable().optional(),
  setTags: z.array(z.string().max(64)).max(20).optional().default([]),
});

export type CreateRuleBody = z.infer<typeof createRuleBodySchema>;
