import type { RequestHandler } from "express";
import { config } from "../config.js";
import { ImportSource } from "../enums/index.js";
import { AppError } from "../errors/AppError.js";
import { cancelActiveScan } from "../gmail/poolingService.js";
import { parsePdf } from "../parser.js";
import type {
  CorrectTransactionBody,
  DashboardQuery,
} from "../validators/imports.js";
import { assertPdfUpload, mapPdfImportError } from "./pdfErrors.js";
import {
  clearImportedDataForUser,
  correctTransactionForUser,
  createManualExpense,
  deleteTransactionForUser,
  getDashboardForUser,
  getImportStatusForUser,
  listImportsForUser,
  processPdfImport,
  setBillSplit,
} from "./service.js";
import type { BillSplitBody, ManualExpenseBody } from "../validators/imports.js";

export const getDashboardController: RequestHandler = async (req, res) => {
  const query = req.query as DashboardQuery;
  const result = await getDashboardForUser(req.user!.id, {
    from: query.from,
    to: query.to,
  });
  res.json(result);
};

export const getImportStatusController: RequestHandler = async (req, res) => {
  const status = await getImportStatusForUser(req.user!.id);
  res.json(status);
};

export const clearImportedDataController: RequestHandler = async (req, res) => {
  cancelActiveScan(req.user!.id);
  res.json(await clearImportedDataForUser(req.user!.id));
};

export const listImportsController: RequestHandler = async (req, res) => {
  const imports = await listImportsForUser(req.user!.id);
  res.json({ imports });
};

export const uploadImportController: RequestHandler = async (req, res) => {
  const file = assertPdfUpload(req.file);
  const body = req.body as { password?: string };
  try {
    const { importId, result, inserted, skipped, isDuplicate, previousImportDate } =
      await processPdfImport({
        userId: req.user!.id,
        buffer: file.buffer,
        filename: file.originalname,
        password: body.password ?? "",
        source: ImportSource.Upload,
      });
    const response = { importId, inserted, skipped, ...result };
    if (isDuplicate && previousImportDate) {
      Object.assign(response, {
        isDuplicate: true,
        message: `This bank statement was already imported on ${new Date(previousImportDate).toLocaleDateString()}`,
      });
    }
    res.json(response);
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

export const deleteTransactionController: RequestHandler = async (req, res) => {
  res.json(await deleteTransactionForUser(req.user!.id, String(req.params.id)));
};

export const createManualExpenseController: RequestHandler = async (req, res) => {
  const body = req.body as ManualExpenseBody;
  const transaction = await createManualExpense(req.user!.id, body);
  res.status(201).json({ transaction });
};

export const setBillSplitController: RequestHandler = async (req, res) => {
  const body = req.body as BillSplitBody;
  const transaction = await setBillSplit(req.user!.id, String(req.params.id), body.friends);
  res.json({ transaction });
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
