import type { RequestHandler } from "express";
import { config } from "../config.js";
import { AppError } from "../errors/AppError.js";
import { parsePdf } from "../parser.js";
import type {
  CorrectTransactionBody,
  DashboardQuery,
} from "../validators/imports.js";
import { assertPdfUpload, mapPdfImportError } from "./pdfErrors.js";
import {
  correctTransactionForUser,
  getDashboardForUser,
  listImportsForUser,
  processPdfImport,
} from "./service.js";

export const getDashboardController: RequestHandler = async (req, res) => {
  const query = req.query as DashboardQuery;
  const result = await getDashboardForUser(req.user!.id, {
    from: query.from,
    to: query.to,
  });
  res.json(result);
};

export const listImportsController: RequestHandler = async (req, res) => {
  const imports = await listImportsForUser(req.user!.id);
  res.json({ imports });
};

export const uploadImportController: RequestHandler = async (req, res) => {
  const file = assertPdfUpload(req.file);
  const body = req.body as { password?: string };
  try {
    const { importId, result, inserted, skipped } = await processPdfImport({
      userId: req.user!.id,
      buffer: file.buffer,
      filename: file.originalname,
      password: body.password ?? "",
      source: "upload",
    });
    res.json({ importId, inserted, skipped, ...result });
  } catch (error) {
    mapPdfImportError(error);
  }
};

export const parseEphemeralController: RequestHandler = async (req, res) => {
  if (!config.allowAnonParse) {
    throw AppError.unauthorized("Authentication required");
  }
  const file = assertPdfUpload(req.file);
  const body = req.body as { password?: string };
  try {
    const result = await parsePdf(file.buffer, body.password ?? "");
    res.json(result);
  } catch (error) {
    mapPdfImportError(error);
  }
};

export const correctTransactionController: RequestHandler = async (req, res) => {
  const body = req.body as CorrectTransactionBody;
  const result = await correctTransactionForUser({
    userId: req.user!.id,
    transactionId: String(req.params.id),
    payee: body.payee,
    merchant: body.merchant,
    categorySlug: body.categorySlug,
    providerId: body.providerId,
    applyFuture: body.applyFuture,
  });
  res.json(result);
};
