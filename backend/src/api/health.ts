import { Router } from "express";
import { config } from "../config.js";
import { getStore } from "../db/index.js";
import { gmailConfigured } from "../gmail/client.js";

export const healthRouter = Router();

/** Liveness — process is up. No dependency checks. */
healthRouter.get("/live", (_req, res) => {
  res.status(200).json({ status: "alive" });
});

/** Readiness — can serve traffic (DB reachable). */
healthRouter.get("/ready", async (_req, res) => {
  try {
    const store = await getStore();
    const ok = await store.healthCheck();
    if (!ok) {
      res.status(503).json({ status: "not_ready", reason: "database" });
      return;
    }
    res.status(200).json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "not_ready", reason: "database" });
  }
});

/**
 * Aggregate health for humans / simple uptime checks.
 * Prefer /live and /ready for Kubernetes-style probes.
 */
healthRouter.get("/health", async (_req, res) => {
  let database: "ok" | "error" | "memory" = "memory";
  try {
    const store = await getStore();
    const ok = await store.healthCheck();
    database = config.useMemoryStore ? "memory" : ok ? "ok" : "error";
    if (!ok && !config.useMemoryStore) {
      res.status(503).json({
        status: "degraded",
        product: "ledgerline",
        database,
        gmailConfigured: gmailConfigured(),
      });
      return;
    }
  } catch {
    database = "error";
    res.status(503).json({
      status: "degraded",
      product: "ledgerline",
      database,
      gmailConfigured: gmailConfigured(),
    });
    return;
  }

  res.json({
    status: "ok",
    product: "ledgerline",
    env: config.env,
    database,
    auth: true,
    gmailConfigured: gmailConfigured(),
  });
});
