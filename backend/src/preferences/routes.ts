import { Router } from "express";
import { requireAuth } from "../auth/service.js";
import { getStore } from "../db/index.js";
import { validate } from "../middleware/validate.js";
import { updatePreferencesBodySchema } from "../validators/preferences.js";

export const preferencesRouter = Router();
preferencesRouter.use(requireAuth);

preferencesRouter.get("/", async (req, res) => {
  const store = await getStore();
  const user = await store.findUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: { message: "User not found" } });
    return;
  }
  res.json({
    dailySpendLimit: user.dailySpendLimit,
  });
});

preferencesRouter.patch(
  "/",
  validate(updatePreferencesBodySchema),
  async (req, res) => {
    const store = await getStore();
    const body = req.body as { dailySpendLimit?: number | null };
    if (!("dailySpendLimit" in body)) {
      const user = await store.findUserById(req.user!.id);
      if (!user) {
        res.status(404).json({ error: { message: "User not found" } });
        return;
      }
      res.json({ dailySpendLimit: user.dailySpendLimit });
      return;
    }
    const user = await store.updateUserPreferences(req.user!.id, {
      dailySpendLimit: body.dailySpendLimit ?? null,
    });
    if (!user) {
      res.status(404).json({ error: { message: "User not found" } });
      return;
    }
    await store.audit(req.user!.id, "preferences.updated", {
      dailySpendLimit: user.dailySpendLimit,
    });
    res.json({
      dailySpendLimit: user.dailySpendLimit,
    });
  },
);
