import fs from "node:fs";
import path from "node:path";

/**
 * Merge `.env` then `.env.local` into process.env without clobbering variables
 * already present at Node startup (shell / CI). Matches Next.js precedence for local dev.
 */
const initialEnv = { ...process.env };

function parseEnvFile(relPath) {
  const full = path.join(process.cwd(), relPath);
  let text;
  try {
    text = fs.readFileSync(full, "utf8");
  } catch {
    return {};
  }
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/** @returns {Record<string, string>} */
export function readMergedEnvFromFiles() {
  return {
    ...parseEnvFile(".env"),
    ...parseEnvFile(".env.local"),
  };
}

const merged = readMergedEnvFromFiles();

for (const [key, value] of Object.entries(merged)) {
  if (Object.prototype.hasOwnProperty.call(initialEnv, key)) continue;
  process.env[key] = value;
}
