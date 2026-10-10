import { z } from "zod";
import { ISO_DATE_RE } from "../constants/index.js";

export const parsePasswordBodySchema = z.object({
  password: z.string().max(256).optional().default(""),
});

export const dashboardQuerySchema = z.object({
  from: z
    .string()
    .regex(ISO_DATE_RE, "from must be YYYY-MM-DD")
    .optional(),
  to: z
    .string()
    .regex(ISO_DATE_RE, "to must be YYYY-MM-DD")
    .optional(),
});

export const correctTransactionBodySchema = z.object({
  payee: z.string().trim().min(1).max(200).optional(),
  merchant: z.string().trim().min(1).max(200).optional(),
  categorySlug: z.string().trim().min(1).max(64).nullable().optional(),
  providerId: z.string().uuid().optional().nullable(),
  applyFuture: z.boolean().optional().default(false),
});

export type CorrectTransactionBody = z.infer<
  typeof correctTransactionBodySchema
>;
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export const manualExpenseBodySchema = z.object({
  date: z
    .string()
    .regex(ISO_DATE_RE, "date must be YYYY-MM-DD")
    .refine((date) => {
      const parsed = new Date(`${date}T00:00:00Z`);
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      return parsed <= today;
    }, "date cannot be in the future"),
  amount: z
    .coerce
    .number()
    .min(0.01, "amount must be at least ₹0.01")
    .max(999_999, "amount cannot exceed ₹999,999"),
  categorySlug: z.string().trim().min(1, "category is required").max(64),
  description: z
    .string()
    .trim()
    .min(3, "description must be at least 3 characters")
    .max(200, "description must be under 200 characters")
    .regex(/^[a-zA-Z0-9\s\-\/.,'&]*$/, "description contains invalid characters"),
});

export const billSplitBodySchema = z.object({
  friends: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        amount: z.coerce.number().positive().max(10_000_000),
      }),
    )
    .max(12),
});

export type ManualExpenseBody = z.infer<typeof manualExpenseBodySchema>;
export type BillSplitBody = z.infer<typeof billSplitBodySchema>;
