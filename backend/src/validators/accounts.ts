import { z } from "zod";

export const patchAccountBodySchema = z.object({
  bank: z.string().trim().min(1).max(40).optional(),
  label: z.string().trim().min(1).max(80).optional(),
  statementSenderEmails: z
    .array(z.string().trim().min(1).max(200))
    .max(30)
    .optional(),
  /** When true, create account for bank if missing (uses defaults from preset). */
  createIfMissing: z.boolean().optional().default(false),
});
