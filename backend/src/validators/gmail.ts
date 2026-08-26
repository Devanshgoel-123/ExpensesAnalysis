import { z } from "zod";

export const enablePoolingBodySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM")
    .optional(),
  password: z.string().max(200).optional().default(""),
  maxMessages: z.coerce.number().int().min(1).max(25).optional().default(15),
  accountId: z.string().uuid().optional(),
});

export const gmailBackfillBodySchema = z.object({
  password: z.string().max(200).optional().default(""),
  maxMessages: z.coerce.number().int().min(1).max(25).optional().default(10),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});
