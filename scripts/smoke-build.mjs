import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const nextDir = path.join(repoRoot, ".next");
const appPathsManifestPath = path.join(nextDir, "server", "app-paths-manifest.json");

const failures = [];

if (!existsSync(nextDir)) {
  failures.push("Missing .next directory. Run `npx next build` first.");
}

if (!existsSync(appPathsManifestPath)) {
  failures.push("Missing .next/server/app-paths-manifest.json. Build artifacts look incomplete.");
}

if (failures.length === 0) {
  const manifest = JSON.parse(readFileSync(appPathsManifestPath, "utf8"));
  const requiredRoutes = [
    "/api/health/route",
    "/api/ready/route",
    "/dashboard/page",
    "/student/home/page",
  ];

  for (const route of requiredRoutes) {
    if (!(route in manifest)) {
      failures.push(`Missing required built route in app-paths manifest: ${route}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Build smoke check failed:\n");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Build smoke check passed.");
