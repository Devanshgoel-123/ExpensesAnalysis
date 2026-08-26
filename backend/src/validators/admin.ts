import { z } from "zod";

export const adminProviderLogoBodySchema = z.object({
  logoUrl: z.string().max(500).nullable(),
});
