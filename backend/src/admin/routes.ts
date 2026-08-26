import { Router } from "express";
import { getStore } from "../db/index.js";
import { AppError } from "../errors/AppError.js";
import { validate } from "../middleware/validate.js";
import { resolveProviderLogo } from "../providers/registry.js";
import { uuidParamSchema } from "../validators/common.js";
import { adminProviderLogoBodySchema } from "../validators/admin.js";
import { requireAdmin } from "./middleware.js";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.patch(
  "/providers/:id",
  validate(uuidParamSchema, "params"),
  validate(adminProviderLogoBodySchema),
  async (req, res) => {
    const store = await getStore();
    const provider = await store.getProviderById(String(req.params.id));
    if (!provider) {
      throw AppError.notFound("Provider not found");
    }
    if (!provider.isGlobal) {
      throw AppError.forbidden("Only global providers can be updated by admin");
    }

    const body = req.body as { logoUrl: string | null };
    const updated = await store.upsertProvider({
      ...provider,
      logoUrl: body.logoUrl,
    });

    await store.audit(req.user!.id, "admin.provider_logo", {
      providerId: updated.id,
      canonicalName: updated.canonicalName,
      logoUrl: updated.logoUrl,
    });

    res.json({
      provider: {
        ...updated,
        ...resolveProviderLogo({
          logoUrl: updated.logoUrl,
          websiteDomain: updated.websiteDomain,
          name: updated.canonicalName,
        }),
      },
    });
  },
);
