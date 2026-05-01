/**
 * Loads `.env.local` from the repo root into `process.env` (simple KEY=VALUE parser).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadEnvLocal() {
  const roots = [
    process.cwd(),
    path.join(__dirname, ".."),
  ];
  const seen = new Set();
  for (const root of roots) {
    const norm = path.resolve(root);
    if (seen.has(norm)) continue;
    seen.add(norm);
    const envPath = path.join(norm, ".env.local");
    if (!fs.existsSync(envPath)) continue;
    const text = fs.readFileSync(envPath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
    return;
  }
}
