import { z } from "zod";

const appEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET or NEXTAUTH_SECRET is required"),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  RATE_LIMIT_STORE: z.enum(["memory", "mongo", "auto"]).default("auto"),
  AUDIT_LOG_SINK: z.enum(["console", "mongo", "both", "auto"]).default("auto"),
  HEALTHCHECK_DB_TIMEOUT_MS: z.coerce.number().int().positive().default(3000),
});

export type AppEnv = z.infer<typeof appEnvSchema>;

let cachedEnv: AppEnv | null = null;

export function resolveAuthSecret(env: NodeJS.ProcessEnv = process.env) {
  const secret = env.AUTH_SECRET?.trim() || env.NEXTAUTH_SECRET?.trim();
  return secret || undefined;
}

export function getAppEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  if (env === process.env && cachedEnv) {
    return cachedEnv;
  }

  const parsed = appEnvSchema.parse({
    NODE_ENV: env.NODE_ENV,
    DATABASE_URL: env.DATABASE_URL,
    AUTH_SECRET: resolveAuthSecret(env),
    NEXTAUTH_URL: env.NEXTAUTH_URL,
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
    PORT: env.PORT,
    RATE_LIMIT_STORE: env.RATE_LIMIT_STORE,
    AUDIT_LOG_SINK: env.AUDIT_LOG_SINK,
    HEALTHCHECK_DB_TIMEOUT_MS: env.HEALTHCHECK_DB_TIMEOUT_MS,
  });

  if (env === process.env) {
    cachedEnv = parsed;
  }

  return parsed;
}

export function clearCachedEnvForTests() {
  cachedEnv = null;
}

export function resolveRateLimitStore(env: NodeJS.ProcessEnv = process.env) {
  const nodeEnv = env.NODE_ENV === "production" ? "production" : env.NODE_ENV === "test" ? "test" : "development";
  const mode = env.RATE_LIMIT_STORE ?? "auto";
  if (mode === "auto") {
    return nodeEnv === "production" ? "mongo" : "memory";
  }
  return mode;
}

export function resolveAuditLogSink(env: NodeJS.ProcessEnv = process.env) {
  const nodeEnv = env.NODE_ENV === "production" ? "production" : env.NODE_ENV === "test" ? "test" : "development";
  const sink = env.AUDIT_LOG_SINK ?? "auto";
  if (sink === "auto") {
    return nodeEnv === "production" ? "both" : "console";
  }
  return sink;
}

export function validateServerEnv(env: NodeJS.ProcessEnv = process.env) {
  const config = getAppEnv(env);

  if (config.NODE_ENV === "production" && !config.NEXT_PUBLIC_APP_URL && !config.NEXTAUTH_URL) {
    throw new Error("NEXT_PUBLIC_APP_URL or NEXTAUTH_URL is required in production");
  }

  return config;
}
