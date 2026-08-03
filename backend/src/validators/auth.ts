import { z } from "zod";

export const registerBodySchema = z.object({
  email: z.string().trim().email().max(320).transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(128),
  inviteCode: z.string().trim().min(1).max(64),
  displayName: z.string().trim().min(1).max(120).optional(),
});

export const loginBodySchema = z.object({
  email: z.string().trim().email().max(320).transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(128),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
