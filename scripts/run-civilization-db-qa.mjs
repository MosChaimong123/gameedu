import "./load-env-for-cli.mjs";
import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL ?? "";
let hostname = "";
let databaseName = "";
try {
  const url = new URL(databaseUrl.replace(/^mongodb(\+srv)?:\/\//i, "http://"));
  hostname = url.hostname;
  databaseName = url.pathname.replace(/^\//, "");
} catch {
  console.error("DATABASE_URL is missing or invalid; refusing Civilization persistence QA.");
  process.exit(1);
}

const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(hostname);
if (!isLocal && process.env.CIVILIZATION_DB_QA_ALLOW_REMOTE !== "true") {
  console.error(`Refusing remote database QA on ${hostname}/${databaseName}.`);
  console.error("Set CIVILIZATION_DB_QA_ALLOW_REMOTE=true only for an isolated staging database.");
  process.exit(1);
}

console.log(`Civilization persistence QA target: ${hostname}/${databaseName}`);
const readinessOnly = process.argv.includes("--readiness");
const prestigeOnly = process.argv.includes("--prestige");
const testPath = readinessOnly
  ? "src/lib/services/civilization-idle/__tests__/civilization-pilot-readiness.integration.test.ts"
  : prestigeOnly
    ? "src/lib/services/civilization-idle/__tests__/civilization-prestige.integration.test.ts"
    : "src/lib/services/civilization-idle/__tests__/civilization-persistence.integration.test.ts";
const result = spawnSync(
  process.execPath,
  [
    "./node_modules/vitest/vitest.mjs",
    "run",
    "--config",
    "vitest.config.mts",
    "--pool",
    "threads",
    "--disableConsoleIntercept",
    testPath,
  ],
  {
    cwd: process.cwd(),
    env: { ...process.env, RUN_CIVILIZATION_DB_QA: "true" },
    stdio: "inherit",
  }
);

process.exit(result.status ?? 1);
