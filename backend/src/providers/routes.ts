import { Router } from "express";
import { requireAuth } from "../auth/service.js";
import { getStore } from "../db/index.js";
import { AppError } from "../errors/AppError.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import {
  createProviderBodySchema,
  updateProviderBodySchema,
} from "../validators/providers.js";
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

providersRouter.patch(
  "/:id",
  validate(updateProviderBodySchema),
  asyncHandler(async (req, res) => {
    const store = await getStore();
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!id) throw AppError.notFound("App not found");
    const existing = await store.getProviderById(id);
    if (
      !existing ||
      (!existing.isGlobal && existing.userId !== req.user!.id)
    ) {
      throw AppError.notFound("App not found");
    }
    const body = req.body as { categorySlug: string };
    const provider = await store.upsertProvider({
      ...existing,
      categorySlug: body.categorySlug,
    });
    res.json({
      provider: {
        ...provider,
        ...resolveProviderLogo({
          logoUrl: provider.logoUrl,
          websiteDomain: provider.websiteDomain,
          name: provider.canonicalName,
        }),
      },
    });
  }),
);
