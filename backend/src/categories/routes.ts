import { Router } from "express";
import { requireAuth } from "../auth/service.js";
import { getStore } from "../db/index.js";
import { AppError } from "../errors/AppError.js";
import { slugifyLabel } from "../helpers/slug.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { createCategoryBodySchema } from "../validators/categories.js";

const ACCENTS = [
  "#6d7c4e",
  "#3d5c68",
  "#3d5f78",
  "#8f5f68",
  "#7d6b86",
  "#8a6a3d",
  "#6b7368",
];

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);

categoriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const store = await getStore();
    const categories = await store.listCategories(req.user!.id);
    res.json({ categories });
  }),
);

categoriesRouter.post(
  "/",
  validate(createCategoryBodySchema),
  asyncHandler(async (req, res) => {
    const store = await getStore();
    const body = req.body as {
      label: string;
      blurb?: string;
      accent?: string;
    };
    const slug = slugifyLabel(body.label);
    if (!slug) {
      throw AppError.badRequest("Enter a category name with letters or numbers");
    }
    const existing = await store.listCategories(req.user!.id);
    if (existing.some((category) => category.slug === slug)) {
      throw AppError.conflict("That category already exists");
    }
    const accent =
      body.accent ?? ACCENTS[existing.length % ACCENTS.length] ?? "#8b7cff";
    const category = await store.upsertCategory({
      userId: req.user!.id,
      slug,
      label: body.label.trim(),
      blurb: body.blurb?.trim() ?? "",
      accent,
      sortOrder: 80,
      meta: {},
      isGlobal: false,
    });
    await store.audit(req.user!.id, "category.created", { slug });
    res.status(201).json({ category });
  }),
);
