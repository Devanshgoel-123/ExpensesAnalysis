import type multer from "multer";
import { AppError } from "../errors/AppError.js";

export function assertPdfUpload(
  file: Express.Multer.File | undefined,
): Express.Multer.File {
  if (!file || !file.originalname.toLowerCase().endsWith(".pdf")) {
    throw AppError.badRequest("Please upload a PDF file");
  }
  return file;
}

export function mapPdfImportError(error: unknown): never {
  const message = error instanceof Error ? error.message : "Failed to parse PDF";
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

export function mapMulterError(error: multer.MulterError): AppError {
  const message =
    error.code === "LIMIT_FILE_SIZE" ? "File too large (max 25MB)" : error.message;
  return new AppError(message, {
    statusCode: error.code === "LIMIT_FILE_SIZE" ? 413 : 400,
  });
}
