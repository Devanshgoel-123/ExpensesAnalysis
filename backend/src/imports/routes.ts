import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../auth/service.js";
import { mutationRateLimiter, uploadRateLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { uuidParamSchema } from "../validators/common.js";
import {
  billSplitBodySchema,
  correctTransactionBodySchema,
  dashboardQuerySchema,
  manualExpenseBodySchema,
  parsePasswordBodySchema,
} from "../validators/imports.js";
import {
  clearImportedDataController,
  correctTransactionController,
  createManualExpenseController,
  deleteTransactionController,
  getDashboardController,
  getImportStatusController,
  listImportsController,
  setBillSplitController,
  uploadImportController,
} from "./controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

export const importRouter = Router();

importRouter.use(requireAuth);

importRouter.get("/dashboard", validate(dashboardQuerySchema, "query"), getDashboardController);

importRouter.get("/status", getImportStatusController);

importRouter.delete("/data", clearImportedDataController);

importRouter.get("/", listImportsController);

importRouter.post(
  "/upload",
  uploadRateLimiter,
  upload.single("file"),
  validate(parsePasswordBodySchema),
  uploadImportController,
);

importRouter.post("/transactions", validate(manualExpenseBodySchema), createManualExpenseController);

importRouter.put(
  "/transactions/:id/splits",
  validate(uuidParamSchema, "params"),
  validate(billSplitBodySchema),
  setBillSplitController,
);

importRouter.delete(
  "/transactions/:id",
  mutationRateLimiter,
  validate(uuidParamSchema, "params"),
  deleteTransactionController,
);

importRouter.patch(
  "/transactions/:id",
  mutationRateLimiter,
  validate(uuidParamSchema, "params"),
  validate(correctTransactionBodySchema),
  correctTransactionController,
);
