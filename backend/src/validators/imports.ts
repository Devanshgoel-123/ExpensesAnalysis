import { z } from "zod";

export const parsePasswordBodySchema = z.object({
  password: z.string().max(256).optional().default(""),
});

export const dashboardQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "to must be YYYY-MM-DD")
    .optional(),
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
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
