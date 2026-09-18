import { z } from "zod";
import { BACKFILL_MAX_MESSAGES } from "../constants/index.js";

const monthField = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  z
    .string()
    .regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM")
    .optional(),
);

export const enablePoolingBodySchema = z.object({
  month: monthField,
  password: z.string().max(200).optional().default(""),
  maxMessages: z.coerce
    .number()
    .int()
    .min(1)
    .max(BACKFILL_MAX_MESSAGES)
    .optional()
    .default(200),
  accountId: z.string().uuid().optional(),
});

export const gmailBackfillBodySchema = z.object({
  password: z.string().max(200).optional().default(""),
  maxMessages: z.coerce
    .number()
    .int()
    .min(1)
    .max(BACKFILL_MAX_MESSAGES)
    .optional()
    .default(200),
  month: monthField,
});

export type EnablePoolingBody = z.infer<typeof enablePoolingBodySchema>;
export type GmailBackfillBody = z.infer<typeof gmailBackfillBodySchema>;
