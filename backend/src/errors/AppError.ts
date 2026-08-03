/**
 * Typed application errors with HTTP status codes.
 * Never expose stack traces to clients — the global handler sanitizes responses.
 */

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE"
  | "UNPROCESSABLE"
  | "INTERNAL"
  | "SERVICE_UNAVAILABLE";

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
      code: "BAD_REQUEST",
      details,
    });
  }

  static unauthorized(message = "Authentication required"): AppError {
    return new AppError(message, { statusCode: 401, code: "UNAUTHORIZED" });
  }

  static forbidden(message = "Forbidden"): AppError {
    return new AppError(message, { statusCode: 403, code: "FORBIDDEN" });
  }

  static notFound(message = "Resource not found"): AppError {
    return new AppError(message, { statusCode: 404, code: "NOT_FOUND" });
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError(message, {
      statusCode: 409,
      code: "CONFLICT",
      details,
    });
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError(message, {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      details,
    });
  }

  static tooManyRequests(message = "Too many requests"): AppError {
    return new AppError(message, {
      statusCode: 429,
      code: "RATE_LIMITED",
    });
  }

  static serviceUnavailable(message: string): AppError {
    return new AppError(message, {
      statusCode: 503,
      code: "SERVICE_UNAVAILABLE",
    });
  }

  static internal(message = "Internal server error", cause?: unknown): AppError {
    return new AppError(message, {
      statusCode: 500,
      code: "INTERNAL",
      isOperational: false,
      cause,
    });
  }
}

function statusToCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 413:
      return "PAYLOAD_TOO_LARGE";
    case 422:
      return "UNPROCESSABLE";
    case 429:
      return "RATE_LIMITED";
    case 503:
      return "SERVICE_UNAVAILABLE";
    default:
      return status >= 500 ? "INTERNAL" : "BAD_REQUEST";
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
