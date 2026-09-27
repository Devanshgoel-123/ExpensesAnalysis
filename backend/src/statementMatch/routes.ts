import { Router } from "express";
import multer from "multer";
import { bankAdapters, runAdapters } from "../adapters/index.js";
import { requireAuth } from "../auth/service.js";
import { getStore } from "../db/index.js";
import { AppError } from "../errors/AppError.js";
import { extractTextFromPdf } from "../parser.js";
import { ClassificationSource } from "../enums/index.js";
import { uploadRateLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { parsePasswordBodySchema } from "../validators/imports.js";
import { z } from "zod";
import { poolingScanWindow } from "../helpers/index.js";
import {
  inScanWindow,
  normalizeToken,
  planUpiApply,
  summarizeSuggestions,
  type StatementLine,
  type TimelineRow,
  type VendorRef,
} from "./match.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const lineSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().positive(),
  type: z.enum(["debit", "credit"]),
  description: z.string().max(500),
  upiId: z.string().max(120).nullable(),
});

const applySchema = z.object({
  upiId: z.string().trim().min(3).max(120),
  providerId: z.string().uuid(),
  lines: z.array(lineSchema).max(5000),
});

export const statementMatchRouter = Router();
statementMatchRouter.use(requireAuth);

statementMatchRouter.post(
  "/preview",
  uploadRateLimiter,
  upload.single("file"),
  validate(parsePasswordBodySchema),
  async (req, res) => {
    const file = req.file;
    if (!file) throw AppError.badRequest("Choose a PDF statement");
    const password = (req.body as { password?: string }).password ?? "";
    const text = await extractTextFromPdf(file.buffer, password);
    const { transactions } = runAdapters(text, bankAdapters);
    const store = await getStore();
    const providers = await store.listProviders(req.user!.id);
    const window = poolingScanWindow();
    const ledger = await store.listTransactions(req.user!.id, {
      from: window.from,
      to: window.to,
    });
    const vendors: VendorRef[] = providers.map((provider) => ({
      id: provider.id,
      canonicalName: provider.canonicalName,
      aliases: provider.aliases,
      categorySlug: provider.categorySlug,
      upiHandles: provider.upiHandles,
    }));
    const lines: StatementLine[] = transactions
      .filter((txn) => txn.type === "debit" || txn.type === "credit")
      .map((txn) => ({
        date: txn.date,
        amount: txn.amount,
        type: txn.type,
        description: txn.description,
        upiId: txn.upiId,
      }));
    const timeline: TimelineRow[] = ledger.map((row) => ({
      id: row.id,
      date: row.date,
      amount: row.amount,
      type: row.type,
      upiId: row.upiId,
      description: row.description,
      providerId: row.providerId,
    }));
    const suggestions = summarizeSuggestions(lines, vendors, timeline, window);
    const outsideWindow = lines.filter((line) => !inScanWindow(line.date, window)).length;
    res.json({
      filename: file.originalname,
      lineCount: lines.length,
      outsideWindow,
      window,
      suggestions,
      lines,
      note: "Nothing was written yet. Approving saves the UPI id on the vendor, then labels every matching payment in the mail-tracking window.",
    });
  },
);

statementMatchRouter.post(
  "/apply",
  validate(applySchema),
  async (req, res) => {
    const body = req.body as z.infer<typeof applySchema>;
    const store = await getStore();
    const provider = await store.getProviderById(body.providerId);
    if (!provider || (!provider.isGlobal && provider.userId !== req.user!.id)) {
      throw AppError.notFound("App not found");
    }

    const trimmed = body.upiId.trim();
    const window = poolingScanWindow();
    const alreadySaved = provider.upiHandles.some(
      (handle) => normalizeToken(handle) === normalizeToken(trimmed),
    );
    if (!alreadySaved) {
      await store.upsertProvider({
        ...provider,
        upiHandles: [...provider.upiHandles, trimmed],
      });
    }

    const ledger = await store.listTransactions(req.user!.id, {
      from: window.from,
      to: window.to,
    });
    const plan = planUpiApply({
      upiId: trimmed,
      providerId: provider.id,
      lines: body.lines,
      ledger: ledger.map((row) => ({
        id: row.id,
        date: row.date,
        amount: row.amount,
        type: row.type,
        upiId: row.upiId,
        description: row.description,
        providerId: row.providerId,
      })),
      window,
    });

    const patch = {
      merchant: provider.canonicalName,
      providerId: provider.id,
      categorySlug: provider.categorySlug ?? undefined,
      upiId: trimmed,
      classificationSource: ClassificationSource.UserOverride,
      confidence: 1,
    };
    for (const id of [...plan.statementIds, ...plan.timelineIds]) {
      await store.updateTransaction(req.user!.id, id, patch);
    }

    await store.audit(req.user!.id, "statement.match_applied", {
      upiId: trimmed,
      providerId: provider.id,
      updated: plan.statementIds.length,
      timelineUpdated: plan.timelineIds.length,
      ambiguous: plan.ambiguous,
      unmatched: plan.unmatched,
      window,
    });

    res.json({
      providerName: provider.canonicalName,
      updated: plan.statementIds.length,
      timelineUpdated: plan.timelineIds.length,
      ambiguous: plan.ambiguous,
      unmatched: plan.unmatched,
      outsideWindow: plan.outsideWindow,
      window,
    });
  },
);
