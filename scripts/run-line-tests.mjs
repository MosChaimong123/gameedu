import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function collect(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collect(path);
    return /line/i.test(path) && /\.test\.ts$/i.test(path) ? [path] : [];
  });
}

const files = collect("src");
const result = spawnSync(
  process.execPath,
  [
    "./node_modules/vitest/vitest.mjs",
    "run",
    "--config",
    "vitest.config.mts",
    "--pool",
    "threads",
    ...files,
  ],
  { stdio: "inherit" }
);
process.exitCode = result.status ?? 1;
