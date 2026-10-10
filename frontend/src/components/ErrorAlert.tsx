"use client";

import { AlertCircle, XCircle } from "lucide-react";

interface ErrorAlertProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
  details?: string;
  variant?: "error" | "warning";
}

export function ErrorAlert({
  title = "Error",
  message,
  onDismiss,
  details,
  variant = "error",
}: ErrorAlertProps) {
  const isError = variant === "error";
  const Icon = isError ? XCircle : AlertCircle;
  const bgClass = isError ? "bg-red-50" : "bg-yellow-50";
  const borderClass = isError ? "border-red-200" : "border-yellow-200";
  const textClass = isError ? "text-red-900" : "text-yellow-900";
  const iconClass = isError ? "text-red-500" : "text-yellow-500";

  return (
    <div className={`${bgClass} border ${borderClass} rounded-lg p-4 mb-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`${iconClass} flex-shrink-0 mt-0.5`} size={20} />
        <div className="flex-1 min-w-0">
          <h3 className={`${textClass} font-semibold mb-1`}>{title}</h3>
          <p className={`${textClass} text-sm mb-2`}>{message}</p>
          {details && (
            <details className={`${textClass} text-xs`}>
              <summary className="cursor-pointer hover:underline">
                Technical details
              </summary>
              <pre className="mt-2 p-2 bg-white rounded border border-current/20 overflow-auto max-h-32 text-left">
                {details}
              </pre>
            </details>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className={`${textClass} flex-shrink-0 hover:opacity-70`}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
