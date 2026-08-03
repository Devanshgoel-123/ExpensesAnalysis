import { z } from "zod";

export const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid id"),
});

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
