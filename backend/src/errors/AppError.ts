/**
 * Typed application errors with HTTP status codes.
 * Never expose stack traces to clients — the global handler sanitizes responses.
 */

import { ErrorCode } from "../enums/index.js";

export type { ErrorCode };

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: unknown;
  readonly isOperational: boolean;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      code?: ErrorCode;
      details?: unknown;
      isOperational?: boolean;
      cause?: unknown;
    } = {},
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "AppError";
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? statusToCode(this.statusCode);
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(message, {
      statusCode: 400,
      code: ErrorCode.BadRequest,
      details,
    });
  }

  static unauthorized(message = "Authentication required"): AppError {
    return new AppError(message, {
      statusCode: 401,
      code: ErrorCode.Unauthorized,
    });
  }

  static forbidden(message = "Forbidden"): AppError {
    return new AppError(message, { statusCode: 403, code: ErrorCode.Forbidden });
  }

  static notFound(message = "Resource not found"): AppError {
    return new AppError(message, { statusCode: 404, code: ErrorCode.NotFound });
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError(message, {
      statusCode: 409,
      code: ErrorCode.Conflict,
      details,
    });
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError(message, {
      statusCode: 400,
      code: ErrorCode.ValidationError,
      details,
    });
  }

  static tooManyRequests(message = "Too many requests"): AppError {
    return new AppError(message, {
      statusCode: 429,
      code: ErrorCode.RateLimited,
    });
  }

  static serviceUnavailable(message: string): AppError {
    return new AppError(message, {
      statusCode: 503,
      code: ErrorCode.ServiceUnavailable,
    });
  }

  static internal(message = "Internal server error", cause?: unknown): AppError {
    return new AppError(message, {
      statusCode: 500,
      code: ErrorCode.Internal,
      isOperational: false,
      cause,
    });
  }
}

function statusToCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCode.BadRequest;
    case 401:
      return ErrorCode.Unauthorized;
    case 403:
      return ErrorCode.Forbidden;
    case 404:
      return ErrorCode.NotFound;
    case 409:
      return ErrorCode.Conflict;
    case 413:
      return ErrorCode.PayloadTooLarge;
    case 422:
      return ErrorCode.Unprocessable;
    case 429:
      return ErrorCode.RateLimited;
    case 503:
      return ErrorCode.ServiceUnavailable;
    default:
      return status >= 500 ? ErrorCode.Internal : ErrorCode.BadRequest;
  }
}

/** Standard error envelope returned to clients. */
export interface ErrorResponseBody {
  error: {
    code: ErrorCode | string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
  /** @deprecated Prefer `error.message`. Kept for older clients. */
  detail?: string;
}
