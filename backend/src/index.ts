import cors from "cors";
import express from "express";
import multer from "multer";
import { authRouter } from "./auth/routes.js";
import { requireAuth } from "./auth/service.js";
import { config } from "./config.js";
import { getStore } from "./db/index.js";
import { gmailRouter } from "./gmail/routes.js";
import { startGmailJobs } from "./gmail/jobs.js";
import { importRouter } from "./imports/routes.js";
import { processPdfImport } from "./imports/service.js";
import { parsePdf } from "./parser.js";
import { seedGlobals } from "./providers/registry.js";
import { providersRouter } from "./providers/routes.js";
import { rulesRouter } from "./rules/routes.js";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    product: "ledgerline",
    auth: true,
    gmailConfigured: Boolean(
      config.google.clientId && config.google.clientSecret,
    ),
  });
});

app.use("/api/auth", authRouter);
app.use("/api/imports", importRouter);
app.use("/api/rules", rulesRouter);
app.use("/api/providers", providersRouter);
app.use("/api/gmail", gmailRouter);

/** Authenticated parse+persist (preferred). */
app.post("/api/parse", requireAuth, upload.single("file"), async (req, res) => {
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

/**
 * Legacy ephemeral parse (no persistence). Kept for smoke/debug only when
 * ALLOW_ANON_PARSE=1 — disabled by default for multi-user tenancy.
 */
app.post("/api/parse-ephemeral", upload.single("file"), async (req, res) => {
  if (process.env.ALLOW_ANON_PARSE !== "1") {
    res.status(401).json({ detail: "Authentication required" });
    return;
  }
  try {
    if (!req.file) {
      res.status(400).json({ detail: "Please upload a PDF file" });
      return;
    }
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";
    const result = await parsePdf(req.file.buffer, password);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse PDF";
    res.status(500).json({ detail: message });
  }
});

async function boot() {
  const store = await getStore();
  await seedGlobals(store);
  startGmailJobs();
  app.listen(config.port, () => {
    console.log(`Ledgerline API listening on http://localhost:${config.port}`);
  });
}

boot().catch((error) => {
  console.error("Failed to start API", error);
  process.exit(1);
});
