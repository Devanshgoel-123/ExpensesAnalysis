import { Router } from "express";
import { requireAuth } from "../auth/service.js";
import { getStore } from "../db/index.js";

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);

categoriesRouter.get("/", async (req, res) => {
  const store = await getStore();
  const categories = await store.listCategories(req.user!.id);
  res.json({ categories });
});
