import { Router } from "express";
import multer from "multer";
import { bankAdapters, runAdapters } from "../adapters/index.js";
import { requireAuth } from "../auth/service.js";
import { getStore } from "../db/index.js";
import { AppError } from "../errors/AppError.js";
import { extractTextFromPdf } from "../parser.js";
import { uploadRateLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { parsePasswordBodySchema } from "../validators/imports.js";
import { z } from "zod";
import { poolingScanWindow, toIstCalendarDate } from "../helpers/index.js";
import { applyUpiBatch, getMatchJob, startMatchJob } from "./applyBatch.js";
import { importMissingLines } from "./importMissing.js";
import {
  findStatementGaps,
  inScanWindow,
  shiftIsoDate,
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

const importMissingSchema = z.object({
  lines: z
    .array(
      lineSchema.extend({
        categorySlug: z.string().trim().min(1).max(64).nullable().optional(),
      }),
    )
    .min(1)
    .max(500),
});

const applySchema = z.object({
  upiId: z.string().trim().min(3).max(120),
  providerId: z.string().uuid(),
  lines: z.array(lineSchema).max(5000),
});

const applyBatchSchema = z.object({
  lines: z.array(lineSchema).max(5000),
  items: z
    .array(
      z.object({
        upiId: z.string().trim().min(3).max(120),
        providerId: z.string().uuid(),
      }),
    )
    .min(1)
    .max(100),
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
    const mails = await store.listMailMessages(
      req.user!.id,
      shiftIsoDate(window.from, -1),
      shiftIsoDate(window.to, 1),
    );
    const mailDates = mails
      .map((mail) => toIstCalendarDate(mail.receivedAt))
      .filter((day): day is string => Boolean(day));
    const gaps = findStatementGaps({
      lines,
      ledger: timeline,
      mailDates,
      window,
    });
    res.json({
      filename: file.originalname,
      lineCount: lines.length,
      outsideWindow,
      window,
      suggestions,
      gaps,
      lines,
      note: "Nothing was written yet. Approving saves the UPI id on the vendor, then labels every matching payment in the mail-tracking window.",
    });
  },
);

statementMatchRouter.post(
  "/import-missing",
  validate(importMissingSchema),
  async (req, res) => {
    const body = req.body as z.infer<typeof importMissingSchema>;
    const result = await importMissingLines(req.user!.id, body.lines);
    res.json(result);
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
    const result = await applyUpiBatch(req.user!.id, body.lines, [
      { upiId: body.upiId, providerId: body.providerId },
    ]);
    const applied = result.applied[0];
    res.json({
      providerName: provider.canonicalName,
      updated: applied?.updated ?? 0,
      timelineUpdated: applied?.timelineUpdated ?? 0,
      ambiguous: applied?.ambiguous ?? 0,
      unmatched: applied?.unmatched ?? 0,
      outsideWindow: applied?.outsideWindow ?? 0,
      window: poolingScanWindow(),
    });
  },
);

statementMatchRouter.post(
  "/apply-batch",
  validate(applyBatchSchema),
  (req, res) => {
    const body = req.body as z.infer<typeof applyBatchSchema>;
    const job = startMatchJob(req.user!.id, body.lines, body.items);
    res.status(202).json(job);
  },
);

statementMatchRouter.get("/apply-batch/:jobId", (req, res) => {
  const job = getMatchJob(req.user!.id, String(req.params.jobId ?? ""));
  if (!job) throw AppError.notFound("Approval not found");
  res.json(job);
});
