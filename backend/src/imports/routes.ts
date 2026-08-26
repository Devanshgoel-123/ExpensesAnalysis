import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../auth/service.js";
import { uploadRateLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { uuidParamSchema } from "../validators/common.js";
import {
  correctTransactionBodySchema,
  dashboardQuerySchema,
  parsePasswordBodySchema,
} from "../validators/imports.js";
import {
  correctTransactionController,
  getDashboardController,
  listImportsController,
  uploadImportController,
} from "./controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

export const importRouter = Router();

importRouter.use(requireAuth);

importRouter.get("/dashboard", validate(dashboardQuerySchema, "query"), getDashboardController);

importRouter.get("/", listImportsController);

importRouter.post(
  "/upload",
  uploadRateLimiter,
  upload.single("file"),
  validate(parsePasswordBodySchema),
  uploadImportController,
);

importRouter.patch(
  "/transactions/:id",
  validate(uuidParamSchema, "params"),
  validate(correctTransactionBodySchema),
  correctTransactionController,
);
