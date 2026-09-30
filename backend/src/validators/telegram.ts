import { z } from "zod";

export const telegramPhoneBodySchema = z.object({
  phone: z.string().trim().min(8).max(20),
});

export const telegramCodeBodySchema = z.object({
  code: z.string().trim().min(4).max(12),
});
