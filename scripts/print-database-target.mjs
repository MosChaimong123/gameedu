import "./load-env-for-cli.mjs";
import { readMergedEnvFromFiles } from "./load-env-for-cli.mjs";

/** @param {string} url */
function hostAndDb(url) {
  let host = "(unknown)";
  let db = "(default)";
  try {
    const rest = url.replace(/^mongodb(\+srv)?:\/\//i, "http://");
    const u = new URL(rest);
    host = u.hostname;
    db = u.pathname.replace(/^\//, "") || "(default)";
  } catch {
    const h = url.match(/@([^/?]+)/);
    if (h) host = h[1];
    const d = url.match(/\.net\/([^?]+)/i);
    if (d) db = d[1] || "(default)";
  }
  return { host, db };
}

const merged = readMergedEnvFromFiles();
const fromFiles = merged.DATABASE_URL;
const url = process.env.DATABASE_URL;

if (fromFiles && url && fromFiles !== url) {
  const eff = hostAndDb(url);
  const fil = hostAndDb(fromFiles);
  console.warn(
    "DATABASE_URL from shell / environment overrides .env + .env.local (CI uses this; local dev may be accidental).",
  );
  console.warn("  Effective:", eff.host, "/", eff.db);
  console.warn("  From files:", fil.host, "/", fil.db);
  console.warn(
    "  To use files only in this session: Remove-Item Env:DATABASE_URL (PowerShell)",
  );
  console.warn("");
}

if (!url) {
  console.log("DATABASE_URL is not set (after .env / .env.local merge, respecting shell).");
  process.exit(0);
}

const { host, db } = hostAndDb(url);
const isLocal = /localhost|127\.0\.0\.1/i.test(host);

console.log("Mongo host:", host);
console.log("Database name in path:", db);
console.log(
  "Looks like:",
  isLocal ? "local Mongo on this machine" : "remote cluster (e.g. Atlas)",
);
