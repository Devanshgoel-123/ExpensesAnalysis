import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const INSECURE_JWT_DEFAULTS = new Set([
  "dev-only-jwt-secret-change-me",
  "change-me-to-a-long-random-string",
  "test-jwt-secret",
]);

const INSECURE_ENCRYPTION_DEFAULTS = new Set([
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
]);

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1).default("memory"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  ENCRYPTION_KEY: z
    .string()
    .regex(
      /^[0-9a-fA-F]{64}$/,
      "ENCRYPTION_KEY must be 64 hex characters (32 bytes)",
    ),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  ALLOW_ANON_PARSE: z.enum(["0", "1"]).default("0"),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_REDIRECT_URI: z
    .string()
    .default("http://localhost:4000/api/v1/auth/google/callback"),
  GOOGLE_ALLOWED_EMAILS: z.string().optional().default(""),
  ADMIN_EMAILS: z.string().optional().default(""),
  GMAIL_PUBSUB_TOPIC: z.string().optional().default(""),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_UPLOAD_MAX: z.coerce.number().int().positive().default(15),
  DB_POOL_MAX: z.coerce.number().int().positive().default(20),
  DB_POOL_IDLE_MS: z.coerce.number().int().positive().default(30_000),
  DB_POOL_CONN_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
});

export type AppConfig = {
  env: "development" | "test" | "production";
  isProduction: boolean;
  isTest: boolean;
  port: number;
  logLevel: z.infer<typeof envSchema>["LOG_LEVEL"];
  corsOrigins: string[];
  databaseUrl: string;
  useMemoryStore: boolean;
  jwtSecret: string;
  encryptionKey: string;
  frontendUrl: string;
  allowAnonParse: boolean;
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    pubsubTopic: string;
    allowedEmails: string[];
  };
  adminEmails: string[];
  rateLimit: {
    windowMs: number;
    max: number;
    authMax: number;
    uploadMax: number;
  };
  dbPool: {
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
};

function resolveJwtSecret(raw: string | undefined, nodeEnv: string): string {
  if (raw && raw.length >= 16) return raw;
  if (nodeEnv === "production") {
    throw new Error("JWT_SECRET is required in production (min 16 chars)");
  }
  return raw && raw.length >= 16 ? raw : "dev-only-jwt-secret-change-me";
}

function resolveEncryptionKey(
  raw: string | undefined,
  nodeEnv: string,
): string {
  if (raw && /^[0-9a-fA-F]{64}$/.test(raw)) return raw;
  if (nodeEnv === "production") {
    throw new Error(
      "ENCRYPTION_KEY is required in production (64 hex characters)",
    );
  }
  return (
    raw && /^[0-9a-fA-F]{64}$/.test(raw)
      ? raw
      : "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  );
}

function loadConfig(): AppConfig {
  const nodeEnv = process.env.NODE_ENV ?? "development";

  const parsed = envSchema.safeParse({
    ...process.env,
    JWT_SECRET: resolveJwtSecret(process.env.JWT_SECRET, nodeEnv),
    ENCRYPTION_KEY: resolveEncryptionKey(process.env.ENCRYPTION_KEY, nodeEnv),
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid configuration:\n${details}`);
  }

  const env = parsed.data;

  if (env.NODE_ENV === "production") {
    if (INSECURE_JWT_DEFAULTS.has(env.JWT_SECRET)) {
      throw new Error(
        "JWT_SECRET uses an insecure default. Set a strong secret before production.",
      );
    }
    if (INSECURE_ENCRYPTION_DEFAULTS.has(env.ENCRYPTION_KEY.toLowerCase())) {
      throw new Error(
        "ENCRYPTION_KEY uses an insecure default. Set a unique 32-byte key before production.",
      );
    }
    if (env.DATABASE_URL === "memory") {
      throw new Error(
        "DATABASE_URL=memory is not allowed in production. Use PostgreSQL.",
      );
    }
  }

  const corsOrigins = env.CORS_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (corsOrigins.length === 0) {
    throw new Error("CORS_ORIGINS must include at least one origin");
  }

  return {
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === "production",
    isTest: env.NODE_ENV === "test",
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    corsOrigins,
    databaseUrl: env.DATABASE_URL,
    useMemoryStore: env.DATABASE_URL === "memory",
    jwtSecret: env.JWT_SECRET,
    encryptionKey: env.ENCRYPTION_KEY,
    frontendUrl: env.FRONTEND_URL,
    allowAnonParse: env.ALLOW_ANON_PARSE === "1",
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: env.GOOGLE_REDIRECT_URI,
      pubsubTopic: env.GMAIL_PUBSUB_TOPIC,
      allowedEmails: env.GOOGLE_ALLOWED_EMAILS.split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    },
    adminEmails: env.ADMIN_EMAILS.split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      authMax: env.RATE_LIMIT_AUTH_MAX,
      uploadMax: env.RATE_LIMIT_UPLOAD_MAX,
    },
    dbPool: {
      max: env.DB_POOL_MAX,
      idleTimeoutMillis: env.DB_POOL_IDLE_MS,
      connectionTimeoutMillis: env.DB_POOL_CONN_TIMEOUT_MS,
    },
  };
}

export const config: AppConfig = loadConfig();
