import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, "src");
const STRICT_MODE = process.argv.includes("--strict");

const INCLUDED_EXTENSIONS = new Set([".ts", ".tsx"]);

const SKIP_PATH_SEGMENTS = [
  `${path.sep}__tests__${path.sep}`,
  `${path.sep}lib${path.sep}translations`,
  `${path.sep}lib${path.sep}translation-lookup`,
  `${path.sep}lib${path.sep}translations-th-legacy.json`,
  `${path.sep}lib${path.sep}socket-error-messages.ts`,
  `${path.sep}lib${path.sep}quiz-load-error-messages.ts`,
];

const JSX_SCAN_ROOTS = [
  `${path.sep}app${path.sep}`,
  `${path.sep}components${path.sep}`,
];

const PROP_NAMES = ["placeholder", "title", "aria-label", "alt"];

const ALLOWED_LITERAL_PATTERNS = [
  /^https?:\/\//,
  /^mailto:/,
  /^[A-Z0-9_]+$/,
  /^[A-Z][A-Za-z0-9]+$/,
  /^[a-z][A-Za-z0-9_]*$/,
  /^[a-z0-9-]+\/[a-z0-9.+-]+$/,
  /^#[0-9A-Fa-f]{3,8}$/,
  /^\.[A-Za-z0-9]+$/,
  /^\/[A-Za-z0-9/_-]+$/,
  /^\s*$/,
  /^\d+$/,
  /^[@:/?&=._%+-]+$/,
];

const ALLOWED_SUBSTRINGS = [
  "use client",
  "application/json",
  "same-origin",
  "Content-Type",
  "socket.io",
  "localhost",
  "onrender.com",
  "dicebear.com",
  "youtube.com",
  "youtu.be",
  "bg-",
  "text-",
  "border-",
  "shadow-",
  "from-",
  "to-",
  "hover:",
  "group-hover:",
  "animate-",
  "className",
  "return (",
  "new Date(",
  "h.value",
  "x²",
  "type ToastActionElement",
  "onKeyChange: (newKey: Record",
  "if (type ===",
  "parentFolderId === currentFolderId",
  "o !== \"\"",
];

function isSkippedFile(filePath) {
  return SKIP_PATH_SEGMENTS.some((segment) => filePath.includes(segment));
}

function isJsxCandidate(filePath) {
  return path.extname(filePath) === ".tsx" && JSX_SCAN_ROOTS.some((segment) => filePath.includes(segment));
}

function isAllowedLiteral(text) {
  const normalized = text.trim();
  if (!normalized) return true;
  if (normalized.includes("t(") || normalized.includes("{") || normalized.includes("}")) return true;
  if (
    normalized.startsWith("use") &&
    (normalized.includes("must be used within") ||
      normalized.includes("should be used within"))
  ) {
    return true;
  }
  if (normalized === "fetch failed") return true;
  if (ALLOWED_LITERAL_PATTERNS.some((pattern) => pattern.test(normalized))) return true;
  if (ALLOWED_SUBSTRINGS.some((value) => normalized.includes(value))) return true;
  return false;
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      return [fullPath];
    })
  );
  return files.flat();
}

function getLineAndColumn(source, offset) {
  const before = source.slice(0, offset);
  const lines = before.split("\n");
  return {
    line: lines.length,
    column: lines.at(-1).length + 1,
  };
}

function recordFinding(findings, source, filePath, offset, kind, text) {
  const value = text.trim();
  if (!value || isAllowedLiteral(value)) return;
  const { line, column } = getLineAndColumn(source, offset);
  findings.push({
    filePath,
    line,
    column,
    kind,
    text: value,
  });
}

function scanSource(filePath, source) {
  const findings = [];

  if (isJsxCandidate(filePath)) {
    const jsxTextPattern = />\s*([A-Za-z][^<>{}\n]*)\s*</g;
    for (const match of source.matchAll(jsxTextPattern)) {
      recordFinding(findings, source, filePath, match.index ?? 0, "jsx-text", match[1]);
    }

    for (const propName of PROP_NAMES) {
      const propPattern = new RegExp(`${propName}\\s*=\\s*"([^"\\n]*[A-Za-z][^"\\n]*)"`, "g");
      for (const match of source.matchAll(propPattern)) {
        recordFinding(findings, source, filePath, match.index ?? 0, `prop:${propName}`, match[1]);
      }
    }
  }

  const toastPattern = /\b(?:title|description|message)\s*:\s*"([^"\n]*[A-Za-z][^"\n]*)"/g;
  for (const match of source.matchAll(toastPattern)) {
    recordFinding(findings, source, filePath, match.index ?? 0, "object-literal", match[1]);
  }

  const newErrorPattern = /new Error\(\s*"([^"\n]*[A-Za-z][^"\n]*)"/g;
  for (const match of source.matchAll(newErrorPattern)) {
    recordFinding(findings, source, filePath, match.index ?? 0, "new-error", match[1]);
  }

  const apiErrorPattern = /\berror\s*:\s*"([^"\n]*[A-Za-z][^"\n]*)"/g;
  for (const match of source.matchAll(apiErrorPattern)) {
    recordFinding(findings, source, filePath, match.index ?? 0, "api-error", match[1]);
  }

  return findings;
}

async function main() {
  const files = (await walk(SRC_ROOT))
    .filter((filePath) => INCLUDED_EXTENSIONS.has(path.extname(filePath)))
    .filter((filePath) => !isSkippedFile(filePath));

  const findings = [];

  for (const filePath of files) {
    const source = await fs.readFile(filePath, "utf8");
    findings.push(...scanSource(filePath, source));
  }

  if (findings.length === 0) {
    console.log("check:i18n passed - no suspicious hardcoded user-facing strings found.");
    return;
  }

  const stream = STRICT_MODE ? console.error : console.log;
  stream(`check:i18n ${STRICT_MODE ? "failed" : "report"} - suspicious hardcoded user-facing strings:\n`);
  for (const finding of findings) {
    const relative = path.relative(ROOT, finding.filePath);
    stream(
      `${relative}:${finding.line}:${finding.column} [${finding.kind}] ${finding.text}`
    );
  }
  stream(
    `\nTotal findings: ${findings.length}\n` +
      "Prefer using t(...), shared translation keys, or shared API error helpers."
  );
  if (STRICT_MODE) {
    process.exitCode = 1;
  }
}

await main();
