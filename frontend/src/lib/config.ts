export const appConfig = {
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:4000",
} as const;
