import { z } from "zod";

const PRODUCTION_PUBLIC_URL_REQUIRED = "productionPublicUrlRequired";

/** Env vars that may be blank; treat blank as unset. */
const trimOrUnset = z
  .union([z.string(), z.undefined()])
  .transform((v) => (typeof v === "string" ? (v.trim() || undefined) : undefined));

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
  /** Stripe billing (optional in dev; required on routes that create checkout / verify webhooks when billing is enabled) */
  STRIPE_SECRET_KEY: trimOrUnset,
  STRIPE_WEBHOOK_SECRET: trimOrUnset,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: trimOrUnset,
  STRIPE_PRICE_PLUS_MONTHLY: trimOrUnset,
  STRIPE_PRICE_PLUS_YEARLY: trimOrUnset,
  /** Thai PSP: none | mock | omise | two_c_two_p — mock enables placeholder UI + webhook */
  BILLING_THAI_PROVIDER: trimOrUnset,
  /** Shared secret for POST /api/webhooks/billing/mock (local/dev; replace with PSP signing for prod) */
  BILLING_THAI_WEBHOOK_SECRET: trimOrUnset,
  /** Omise secret key (skey_...) — server-only; required when BILLING_THAI_PROVIDER=omise */
  OMISE_SECRET_KEY: trimOrUnset,
  /** Omise public key (pkey_...) — optional here; use NEXT_PUBLIC_OMISE_PUBLIC_KEY for Omise.js on the client */
  OMISE_PUBLIC_KEY: trimOrUnset,
  NEXT_PUBLIC_OMISE_PUBLIC_KEY: trimOrUnset,
  /** PLUS amounts in satang (THB × 100). Min PromptPay 2000. Defaults: 29000 / monthly×12 if unset */
  OMISE_PLUS_MONTHLY_SATANG: trimOrUnset,
  OMISE_PLUS_YEARLY_SATANG: trimOrUnset,
  /** Resend API key — optional in dev; verification emails log link to console if unset */
  RESEND_API_KEY: trimOrUnset,
  /** From address for Resend (e.g. GameEdu <notify@yourdomain.com>) */
  EMAIL_FROM: trimOrUnset,
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
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_PRICE_PLUS_MONTHLY: env.STRIPE_PRICE_PLUS_MONTHLY,
    STRIPE_PRICE_PLUS_YEARLY: env.STRIPE_PRICE_PLUS_YEARLY,
    BILLING_THAI_PROVIDER: env.BILLING_THAI_PROVIDER,
    BILLING_THAI_WEBHOOK_SECRET: env.BILLING_THAI_WEBHOOK_SECRET,
    OMISE_SECRET_KEY: env.OMISE_SECRET_KEY,
    OMISE_PUBLIC_KEY: env.OMISE_PUBLIC_KEY,
    NEXT_PUBLIC_OMISE_PUBLIC_KEY: env.NEXT_PUBLIC_OMISE_PUBLIC_KEY,
    OMISE_PLUS_MONTHLY_SATANG: env.OMISE_PLUS_MONTHLY_SATANG,
    OMISE_PLUS_YEARLY_SATANG: env.OMISE_PLUS_YEARLY_SATANG,
    RESEND_API_KEY: env.RESEND_API_KEY,
    EMAIL_FROM: env.EMAIL_FROM,
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
    throw new Error(PRODUCTION_PUBLIC_URL_REQUIRED);
  }

  return config;
}
