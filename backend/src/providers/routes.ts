import { Router } from "express";
import { requireAuth } from "../auth/service.js";
import { getStore } from "../db/index.js";
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

providersRouter.post("/", async (req, res) => {
  const store = await getStore();
  const body = req.body ?? {};
  if (typeof body.canonicalName !== "string" || !body.canonicalName.trim()) {
    res.status(400).json({ detail: "canonicalName required" });
    return;
  }
  const provider = await store.upsertProvider({
    userId: req.user!.id,
    canonicalName: body.canonicalName.trim(),
    aliases: Array.isArray(body.aliases) ? body.aliases.map(String) : [],
    upiHandles: Array.isArray(body.upiHandles) ? body.upiHandles.map(String) : [],
    senderDomains: Array.isArray(body.senderDomains)
      ? body.senderDomains.map(String)
      : [],
    websiteDomain:
      typeof body.websiteDomain === "string" ? body.websiteDomain : null,
    logoUrl: typeof body.logoUrl === "string" ? body.logoUrl : null,
    categorySlug:
      typeof body.categorySlug === "string" ? body.categorySlug : null,
    isGlobal: false,
  });
  res.status(201).json({ provider });
});
