/**
 * Error message translation: API errors → user-friendly messages
 */

interface ApiError {
  error?: {
    code?: string;
    message?: string;
  };
  detail?: string;
  message?: string;
}

interface UserError {
  title: string;
  message: string;
  details?: string;
  isRecoverable: boolean;
}

export function getErrorMessage(error: unknown): UserError {
  // Network error
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      title: "Connection Error",
      message: "Unable to connect to the server. Check your internet connection.",
      isRecoverable: true,
    };
  }

  // API error response
  if (error && typeof error === "object" && "error" in error) {
    const apiError = error as ApiError;
    const code = apiError.error?.code || "UNKNOWN";
    const message = apiError.error?.message || apiError.detail || "Something went wrong";
    const details = JSON.stringify(error, null, 2);

    switch (code) {
      case "UNAUTHORIZED":
        return {
          title: "Not Authenticated",
          message: "Your session expired. Please sign in again.",
          isRecoverable: true,
        };

      case "FORBIDDEN":
        return {
          title: "Permission Denied",
          message: "You don't have permission to access this resource.",
          isRecoverable: false,
        };

      case "NOT_FOUND":
        return {
          title: "Not Found",
          message: "The resource you're looking for doesn't exist.",
          isRecoverable: false,
        };

      case "BAD_REQUEST":
        return {
          title: "Invalid Input",
          message: message,
          details: message.includes("PDF") ? undefined : details,
          isRecoverable: true,
        };

      case "CONFLICT":
        return {
          title: "Duplicate Import",
          message: message,
          isRecoverable: true,
        };

      case "RATE_LIMITED":
        return {
          title: "Too Many Requests",
          message: "You're making requests too fast. Please wait a moment and try again.",
          isRecoverable: true,
        };

      case "INTERNAL_ERROR":
        return {
          title: "Server Error",
          message:
            "Something went wrong on our end. Please try again or contact support.",
          details,
          isRecoverable: true,
        };

      default:
        return {
          title: "Error",
          message: message,
          details,
          isRecoverable: true,
        };
    }
  }

  // Generic error
  if (error instanceof Error) {
    return {
      title: "Error",
      message: error.message || "Something went wrong",
      isRecoverable: true,
    };
  }

  // Unknown error
  return {
    title: "Unknown Error",
    message: "An unexpected error occurred. Please try again.",
    isRecoverable: true,
  };
}

/**
 * Specific error messages for common operations
 */

export const ErrorMessages = {
  import: {
    invalidPdf: "The file is not a valid PDF. Please check and try again.",
    invalidPassword: "PDF password is incorrect. Check your email from HDFC.",
    duplicateImport: "This bank statement was already imported. Skipped duplicate transactions.",
    noTransactions: "No transactions found in the PDF. Check if it's from HDFC.",
    parsingFailed: "Unable to parse the PDF. Try downloading it again from HDFC.",
  },

  gmail: {
    connectionFailed:
      "Unable to connect to Gmail. Check your authorization and try again.",
    invalidAuth: "Gmail authorization failed. Please sign in again.",
    noMails: "No bank alert emails found. Check your Gmail filters.",
  },

  transaction: {
    amountInvalid: "Amount must be between ₹0.01 and ₹999,999.",
    dateInFuture: "Transaction date cannot be in the future.",
    descriptionInvalid: "Description must be 3-200 characters with valid characters.",
    categoryInvalid: "Selected category is invalid. Please choose another.",
    deleteFailed: "Unable to delete transaction. Please try again.",
    updateFailed: "Unable to update transaction. Please try again.",
  },

  bill: {
    splitInvalid: "Bill split amounts don't match or are invalid.",
    noFriends: "Please add at least one friend to split the bill.",
  },

  auth: {
    invalidEmail: "Please enter a valid email address.",
    passwordWeak: "Password must be at least 8 characters.",
    emailExists: "An account with this email already exists.",
    invalidCredentials: "Email or password is incorrect.",
    inviteCodeInvalid: "Invite code is invalid or expired.",
  },

  network: {
    offline: "You're offline. Check your internet connection.",
    timeout: "Request took too long. Please try again.",
    serverError: "Server error. Please try again later.",
  },
};
