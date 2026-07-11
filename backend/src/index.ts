import cors from "cors";
import express from "express";
import multer from "multer";
import { parsePdf } from "./parser.js";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/parse", upload.single("file"), async (req, res) => {
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

    const result = await parsePdf(req.file.buffer, password);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse PDF";
    if (/password/i.test(message)) {
      res.status(401).json({ detail: "Incorrect PDF password" });
      return;
    }
    if (
      /no transactions|could not extract|empty|please upload|too large/i.test(
        message,
      )
    ) {
      res.status(400).json({ detail: message });
      return;
    }
    res.status(500).json({ detail: `Failed to parse PDF: ${message}` });
  }
});

app.listen(PORT, () => {
  console.log(`UPI Expense API listening on http://localhost:${PORT}`);
});
