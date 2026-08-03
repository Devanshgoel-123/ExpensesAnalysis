import { z } from "zod";

export const createProviderBodySchema = z.object({
  canonicalName: z.string().trim().min(1).max(120),
  aliases: z.array(z.string().max(120)).max(50).optional().default([]),
  upiHandles: z.array(z.string().max(120)).max(50).optional().default([]),
  senderDomains: z.array(z.string().max(200)).max(50).optional().default([]),
  websiteDomain: z.string().max(200).nullable().optional(),
  logoUrl: z.string().max(500).nullable().optional(),
  categorySlug: z.string().max(64).nullable().optional(),
});

export type CreateProviderBody = z.infer<typeof createProviderBodySchema>;
