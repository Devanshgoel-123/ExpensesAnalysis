import { z } from "zod";

export const createCategoryBodySchema = z.object({
  label: z.string().trim().min(1).max(40),
  blurb: z.string().trim().max(160).optional().default(""),
  accent: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/, "accent must be a hex color")
    .optional(),
});

export type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>;
