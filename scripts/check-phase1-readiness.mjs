import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function check(name, ok, detail = "") {
  checks.push({ name, ok, detail });
}

function includes(file, needle) {
  return read(file).includes(needle);
}

const requiredFiles = [
  "render.yaml",
  ".env.example",
  "package.json",
  "src/auth.ts",
  "src/auth.config.ts",
  "src/proxy.ts",
  "src/app/api/health/route.ts",
  "src/app/api/ready/route.ts",
  "src/lib/env.ts",
  "src/lib/socket-io-cors.ts",
  "src/constants/plan-limits.ts",
  "src/lib/plan/plan-access.ts",
  "src/app/api/webhooks/stripe/route.ts",
  "src/app/api/webhooks/billing/[provider]/route.ts",
  "src/app/api/billing/create-checkout-session/route.ts",
  "src/app/api/billing/thai/start/route.ts",
  "docs/phase-1-launch-readiness-execution.md",
];

for (const file of requiredFiles) {
  check(`file exists: ${file}`, exists(file));
}

if (exists("render.yaml")) {
  check("render build command matches Phase 1", includes("render.yaml", "NPM_CONFIG_PRODUCTION=false npm ci && npm run build"));
  check("render start command uses npm run start", includes("render.yaml", "startCommand: npm run start"));
  check("render preDeploy uses prisma db push", includes("render.yaml", "preDeployCommand: npx prisma db push"));
  check("render health check uses /api/ready", includes("render.yaml", "healthCheckPath: /api/ready"));
  check("render sets AUTH_TRUST_HOST true", includes("render.yaml", "AUTH_TRUST_HOST") && includes("render.yaml", 'value: "true"'));
}

if (exists(".env.example")) {
  const envExample = read(".env.example");
  for (const key of [
    "DATABASE_URL",
    "NEXT_PUBLIC_APP_URL",
    "NEXTAUTH_URL",
    "NEXTAUTH_SECRET",
    "AUTH_SECRET",
    "AUTH_TRUST_HOST",
    "NEXT_PUBLIC_SOCKET_URL",
    "SOCKET_IO_CORS_ORIGIN",
    "RATE_LIMIT_STORE",
    "AUDIT_LOG_SINK",
    "ADMIN_SECRET",
    "STRIPE_WEBHOOK_SECRET",
    "BILLING_THAI_PROVIDER",
    "OMISE_SECRET_KEY",
  ]) {
    check(`env example documents ${key}`, envExample.includes(key));
  }
}

if (exists("package.json")) {
  const pkg = JSON.parse(read("package.json"));
  check("package has build script", Boolean(pkg.scripts?.build));
  check("package has test:unit script", Boolean(pkg.scripts?.["test:unit"]));
  check("package has check:i18n script", Boolean(pkg.scripts?.["check:i18n"]));
  check("package has smoke:build script", Boolean(pkg.scripts?.["smoke:build"]));
}

if (exists("src/auth.ts")) {
  check("credentials auth uses rate limit", includes("src/auth.ts", "consumeRateLimitWithStore"));
  check("credentials auth uses bcrypt compare", includes("src/auth.ts", "bcrypt.compare"));
  check("session sync includes plan", includes("src/auth.ts", "token.plan") && includes("src/auth.ts", "session.user.plan"));
}

if (exists("src/auth.config.ts")) {
  check("dashboard blocks STUDENT role", includes("src/auth.config.ts", "role === 'STUDENT'"));
  check("admin requires ADMIN role", includes("src/auth.config.ts", "role !== 'ADMIN'"));
}

if (exists("src/proxy.ts")) {
  check("proxy excludes api routes (requires per-route auth audit)", includes("src/proxy.ts", "api"));
}

if (exists("src/app/api/ready/route.ts")) {
  check("ready route validates server env", includes("src/app/api/ready/route.ts", "validateServerEnv"));
  check("ready route pings operational DB", includes("src/app/api/ready/route.ts", "pingOperationalDb"));
}

if (exists("src/lib/socket-io-cors.ts")) {
  check("socket CORS warns on wildcard in production", includes("src/lib/socket-io-cors.ts", "SOCKET_IO_CORS_ORIGIN=* in production is insecure"));
  check("socket CORS falls back to production app URL", includes("src/lib/socket-io-cors.ts", "NEXT_PUBLIC_APP_URL"));
}

if (exists("src/app/api/webhooks/stripe/route.ts")) {
  check("stripe webhook verifies signature", includes("src/app/api/webhooks/stripe/route.ts", "constructEvent"));
  check("stripe webhook claims event idempotency", includes("src/app/api/webhooks/stripe/route.ts", "claimStripeWebhookEvent"));
}

if (exists("src/app/api/webhooks/billing/[provider]/route.ts")) {
  check("billing webhook supports omise provider", includes("src/app/api/webhooks/billing/[provider]/route.ts", 'provider === "omise"'));
  check("omise webhook retrieves charge before entitlement", includes("src/app/api/webhooks/billing/[provider]/route.ts", "omiseRetrieveCharge"));
}

const validateEnv = process.env.CHECK_PHASE1_ENV === "1";
if (validateEnv) {
  for (const key of [
    "DATABASE_URL",
    "AUTH_SECRET",
    "NEXTAUTH_URL",
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_SOCKET_URL",
    "SOCKET_IO_CORS_ORIGIN",
    "ADMIN_SECRET",
  ]) {
    check(`runtime env set: ${key}`, Boolean(process.env[key]));
  }
  check("mock Thai billing not enabled", process.env.BILLING_THAI_PROVIDER !== "mock");
  check("Socket CORS is not wildcard", process.env.SOCKET_IO_CORS_ORIGIN !== "*");
} else {
  check("runtime env validation skipped", true, "Set CHECK_PHASE1_ENV=1 to validate local/prod-like env variables.");
}

const failed = checks.filter((entry) => !entry.ok);

for (const entry of checks) {
  const prefix = entry.ok ? "PASS" : "FAIL";
  const detail = entry.detail ? ` - ${entry.detail}` : "";
  console.log(`${prefix} ${entry.name}${detail}`);
}

if (failed.length > 0) {
  console.error(`\nPhase 1 readiness check failed: ${failed.length} issue(s).`);
  process.exit(1);
}

console.log("\nPhase 1 readiness static checks passed.");
