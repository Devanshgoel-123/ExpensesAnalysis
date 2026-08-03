import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../auth/service.js";
import { getStore } from "../db/index.js";
import { AppError } from "../errors/AppError.js";
import { uploadRateLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { matchRule } from "../rules/engine.js";
import { uuidParamSchema } from "../validators/common.js";
import {
  correctTransactionBodySchema,
  parsePasswordBodySchema,
} from "../validators/imports.js";
import { getDashboardForUser, processPdfImport } from "./service.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

export const importRouter = Router();

importRouter.use(requireAuth);

importRouter.get("/dashboard", async (req, res) => {
  const result = await getDashboardForUser(req.user!.id);
  res.json(result);
});

importRouter.get("/", async (req, res) => {
  const store = await getStore();
  const imports = await store.listImports(req.user!.id);
  res.json({ imports });
});

importRouter.post(
  "/upload",
  uploadRateLimiter,
  upload.single("file"),
  validate(parsePasswordBodySchema),
  async (req, res) => {
    if (!req.file) {
      throw AppError.badRequest("Please upload a PDF file");
    }
    if (!req.file.originalname.toLowerCase().endsWith(".pdf")) {
      throw AppError.badRequest("Please upload a PDF file");
    }
    try {
      const password =
        typeof req.body?.password === "string" ? req.body.password : "";
      const { importId, result, inserted, skipped } = await processPdfImport({
        userId: req.user!.id,
        buffer: req.file.buffer,
        filename: req.file.originalname,
        password,
        source: "upload",
      });
      res.json({ importId, inserted, skipped, ...result });
    } catch (error) {
      if (error instanceof AppError) throw error;
      const message =
        error instanceof Error ? error.message : "Failed to parse PDF";
      if (/password/i.test(message)) {
        throw AppError.unauthorized("Incorrect PDF password");
      }
      if (
        /no transactions|could not extract|empty|unsupported|please upload|too large/i.test(
          message,
        )
      ) {
        throw AppError.badRequest(message);
      }
      throw AppError.internal(`Failed to parse PDF: ${message}`, error);
    }
  },
);

importRouter.patch(
  "/transactions/:id",
  validate(uuidParamSchema, "params"),
  validate(correctTransactionBodySchema),
  async (req, res) => {
    const store = await getStore();
    const tx = await store.getTransaction(req.user!.id, String(req.params.id));
    if (!tx) {
      throw AppError.notFound("Transaction not found");
    }

    const body = req.body as {
      payee?: string;
      merchant?: string;
      categorySlug?: string;
      providerId?: string | null;
      applyFuture?: boolean;
    };

    const updated = await store.updateTransaction(req.user!.id, tx.id, {
      payee: body.payee,
      merchant: body.merchant,
      categorySlug: body.categorySlug,
      providerId: body.providerId ?? undefined,
      classificationSource: "user_override",
      confidence: 1,
    });

    await store.upsertOverride({
      userId: req.user!.id,
      transactionId: tx.id,
      payee: body.payee ?? null,
      merchant: body.merchant ?? null,
      categorySlug: body.categorySlug ?? null,
      providerId: body.providerId ?? null,
      applyFuture: Boolean(body.applyFuture),
    });

    let reclassified = 0;
    if (body.applyFuture) {
      const rule = await store.createRule({
        userId: req.user!.id,
        name: `Correction for ${body.payee || body.merchant || body.categorySlug || tx.id}`,
        priority: 10,
        enabled: true,
        matchNarrationRe: tx.upiId
          ? null
          : tx.description.slice(0, 40).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        matchUpiId: tx.upiId,
        matchMerchantAlias: null,
        matchAmountMin: null,
        matchAmountMax: null,
        matchType: null,
        setProviderId: body.providerId ?? null,
        setPayeeName: body.payee ?? null,
        setCategorySlug: body.categorySlug ?? null,
        setTags: [],
      });

      reclassified = await store.reclassifyByRule(
        req.user!.id,
        (candidate) => matchRule(rule, candidate) && candidate.id !== tx.id,
        {
          payee: body.payee,
          merchant: body.merchant,
          categorySlug: body.categorySlug,
          providerId: body.providerId ?? undefined,
          classificationSource: `rule:${rule.id}`,
        },
      );
    }

    await store.audit(req.user!.id, "transaction.corrected", {
      transactionId: tx.id,
      applyFuture: Boolean(body.applyFuture),
      reclassified,
    });

    res.json({ transaction: updated, reclassified });
  },
);
