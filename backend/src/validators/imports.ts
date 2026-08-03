import { z } from "zod";

export const parsePasswordBodySchema = z.object({
  password: z.string().max(256).optional().default(""),
});

export const correctTransactionBodySchema = z.object({
  payee: z.string().trim().min(1).max(200).optional(),
  merchant: z.string().trim().min(1).max(200).optional(),
  categorySlug: z.string().trim().min(1).max(64).optional(),
  providerId: z.string().uuid().optional().nullable(),
  applyFuture: z.boolean().optional().default(false),
});

export type CorrectTransactionBody = z.infer<
  typeof correctTransactionBodySchema
>;
