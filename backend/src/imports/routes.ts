import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../auth/service.js";
import { getStore } from "../db/index.js";
import { matchRule } from "../rules/engine.js";
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

importRouter.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ detail: "Please upload a PDF file" });
      return;
    }
    if (!req.file.originalname.toLowerCase().endsWith(".pdf")) {
      res.status(400).json({ detail: "Please upload a PDF file" });
      return;
    }
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
    const message = error instanceof Error ? error.message : "Failed to parse PDF";
    if (/password/i.test(message)) {
      res.status(401).json({ detail: "Incorrect PDF password" });
      return;
    }
    if (
      /no transactions|could not extract|empty|unsupported|please upload|too large/i.test(
        message,
      )
    ) {
      res.status(400).json({ detail: message });
      return;
    }
    res.status(500).json({ detail: `Failed to parse PDF: ${message}` });
  }
});

importRouter.patch("/transactions/:id", async (req, res) => {
  const store = await getStore();
  const tx = await store.getTransaction(req.user!.id, req.params.id);
  if (!tx) {
    res.status(404).json({ detail: "Transaction not found" });
    return;
  }

  const {
    payee,
    merchant,
    categorySlug,
    providerId,
    applyFuture,
  } = req.body ?? {};

  const updated = await store.updateTransaction(req.user!.id, tx.id, {
    payee: typeof payee === "string" ? payee : undefined,
    merchant: typeof merchant === "string" ? merchant : undefined,
    categorySlug: typeof categorySlug === "string" ? categorySlug : undefined,
    providerId: typeof providerId === "string" ? providerId : undefined,
    classificationSource: "user_override",
    confidence: 1,
  });

  await store.upsertOverride({
    userId: req.user!.id,
    transactionId: tx.id,
    payee: typeof payee === "string" ? payee : null,
    merchant: typeof merchant === "string" ? merchant : null,
    categorySlug: typeof categorySlug === "string" ? categorySlug : null,
    providerId: typeof providerId === "string" ? providerId : null,
    applyFuture: Boolean(applyFuture),
  });

  let reclassified = 0;
  if (applyFuture) {
    const rule = await store.createRule({
      userId: req.user!.id,
      name: `Correction for ${payee || merchant || categorySlug || tx.id}`,
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
      setProviderId: typeof providerId === "string" ? providerId : null,
      setPayeeName: typeof payee === "string" ? payee : null,
      setCategorySlug: typeof categorySlug === "string" ? categorySlug : null,
      setTags: [],
    });

    reclassified = await store.reclassifyByRule(
      req.user!.id,
      (candidate) =>
        matchRule(rule, candidate) && candidate.id !== tx.id,
      {
        payee: typeof payee === "string" ? payee : undefined,
        merchant: typeof merchant === "string" ? merchant : undefined,
        categorySlug:
          typeof categorySlug === "string" ? categorySlug : undefined,
        providerId: typeof providerId === "string" ? providerId : undefined,
        classificationSource: `rule:${rule.id}`,
      },
    );
  }

  await store.audit(req.user!.id, "transaction.corrected", {
    transactionId: tx.id,
    applyFuture: Boolean(applyFuture),
    reclassified,
  });

  res.json({ transaction: updated, reclassified });
});
