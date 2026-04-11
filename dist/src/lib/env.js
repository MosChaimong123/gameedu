"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAuthSecret = resolveAuthSecret;
exports.getAppEnv = getAppEnv;
exports.clearCachedEnvForTests = clearCachedEnvForTests;
exports.resolveRateLimitStore = resolveRateLimitStore;
exports.resolveAuditLogSink = resolveAuditLogSink;
exports.validateServerEnv = validateServerEnv;
const zod_1 = require("zod");
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
        throw new Error("NEXT_PUBLIC_APP_URL or NEXTAUTH_URL is required in production");
    }
    return config;
}
