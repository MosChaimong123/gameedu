"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAuthSecret = resolveAuthSecret;
exports.getAppEnv = getAppEnv;
exports.clearCachedEnvForTests = clearCachedEnvForTests;
exports.resolveRateLimitStore = resolveRateLimitStore;
exports.resolveAuditLogSink = resolveAuditLogSink;
exports.validateServerEnv = validateServerEnv;
const zod_1 = require("zod");
const PRODUCTION_PUBLIC_URL_REQUIRED = "productionPublicUrlRequired";
/** Env vars that may be blank; treat blank as unset. */
const trimOrUnset = zod_1.z
    .union([zod_1.z.string(), zod_1.z.undefined()])
    .transform((v) => (typeof v === "string" ? (v.trim() || undefined) : undefined));
const appEnvSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: zod_1.z.string().min(1, "DATABASE_URL is required"),
    AUTH_SECRET: zod_1.z.string().min(1, "AUTH_SECRET or NEXTAUTH_SECRET is required"),
    NEXTAUTH_URL: zod_1.z.string().url().optional(),
    NEXT_PUBLIC_APP_URL: zod_1.z.string().url().optional(),
    PORT: zod_1.z.coerce.number().int().positive().default(3000),
    RATE_LIMIT_STORE: zod_1.z.enum(["memory", "mongo", "auto"]).default("auto"),
    AUDIT_LOG_SINK: zod_1.z.enum(["console", "mongo", "both", "auto"]).default("auto"),
    HEALTHCHECK_DB_TIMEOUT_MS: zod_1.z.coerce.number().int().positive().default(3000),
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
});
let cachedEnv = null;
function resolveAuthSecret(env = process.env) {
    var _a, _b;
    const secret = ((_a = env.AUTH_SECRET) === null || _a === void 0 ? void 0 : _a.trim()) || ((_b = env.NEXTAUTH_SECRET) === null || _b === void 0 ? void 0 : _b.trim());
    return secret || undefined;
}
function getAppEnv(env = process.env) {
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
    });
    if (env === process.env) {
        cachedEnv = parsed;
    }
    return parsed;
}
function clearCachedEnvForTests() {
    cachedEnv = null;
}
function resolveRateLimitStore(env = process.env) {
    var _a;
    const nodeEnv = env.NODE_ENV === "production" ? "production" : env.NODE_ENV === "test" ? "test" : "development";
    const mode = (_a = env.RATE_LIMIT_STORE) !== null && _a !== void 0 ? _a : "auto";
    if (mode === "auto") {
        return nodeEnv === "production" ? "mongo" : "memory";
    }
    return mode;
}
function resolveAuditLogSink(env = process.env) {
    var _a;
    const nodeEnv = env.NODE_ENV === "production" ? "production" : env.NODE_ENV === "test" ? "test" : "development";
    const sink = (_a = env.AUDIT_LOG_SINK) !== null && _a !== void 0 ? _a : "auto";
    if (sink === "auto") {
        return nodeEnv === "production" ? "both" : "console";
    }
    return sink;
}
function validateServerEnv(env = process.env) {
    const config = getAppEnv(env);
    if (config.NODE_ENV === "production" && !config.NEXT_PUBLIC_APP_URL && !config.NEXTAUTH_URL) {
        throw new Error(PRODUCTION_PUBLIC_URL_REQUIRED);
    }
    return config;
}
