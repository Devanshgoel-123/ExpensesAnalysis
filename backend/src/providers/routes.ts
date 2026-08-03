import { Router } from "express";
import { requireAuth } from "../auth/service.js";
import { getStore } from "../db/index.js";
import { validate } from "../middleware/validate.js";
import { createProviderBodySchema } from "../validators/providers.js";
import { resolveProviderLogo } from "./registry.js";

export const providersRouter = Router();
providersRouter.use(requireAuth);

providersRouter.get("/", async (req, res) => {
  const store = await getStore();
  const providers = await store.listProviders(req.user!.id);
  res.json({
    providers: providers.map((p) => ({
      ...p,
      ...resolveProviderLogo({
        logoUrl: p.logoUrl,
        websiteDomain: p.websiteDomain,
        name: p.canonicalName,
      }),
    })),
  });
});

providersRouter.post(
  "/",
  validate(createProviderBodySchema),
  async (req, res) => {
    const store = await getStore();
    const body = req.body as {
      canonicalName: string;
      aliases: string[];
      upiHandles: string[];
      senderDomains: string[];
      websiteDomain?: string | null;
      logoUrl?: string | null;
      categorySlug?: string | null;
    };
    const provider = await store.upsertProvider({
      userId: req.user!.id,
      canonicalName: body.canonicalName.trim(),
      aliases: body.aliases,
      upiHandles: body.upiHandles,
      senderDomains: body.senderDomains,
      websiteDomain: body.websiteDomain ?? null,
      logoUrl: body.logoUrl ?? null,
      categorySlug: body.categorySlug ?? null,
      isGlobal: false,
    });
    res.status(201).json({ provider });
  },
);
