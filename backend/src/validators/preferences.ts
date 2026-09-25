import { z } from "zod";

export const updatePreferencesBodySchema = z.object({
  dailySpendLimit: z
    .union([z.number().positive().max(100_000_000), z.null()])
    .optional(),
});
