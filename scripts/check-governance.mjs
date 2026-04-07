import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const requiredFiles = [
  ".github/pull_request_template.md",
  ".github/workflows/ci.yml",
  "CONTRIBUTING.md",
  "docs/security-pr-review-checklist.md",
  "docs/route-pattern-guide.md",
  "docs/route-authorization-test-template.md",
  "docs/socket-review-checklist.md",
  "docs/page-data-exposure-checklist.md",
  "docs/quarterly-security-sweep-routine.md",
  "docs/contribution-review-workflow.md",
  "src/__tests__/utils/route-test-helpers.ts",
];

const readText = (relativePath) =>
  readFileSync(path.join(repoRoot, relativePath), "utf8");

const failures = [];
const advisories = [];

for (const relativePath of requiredFiles) {
  if (!existsSync(path.join(repoRoot, relativePath))) {
    failures.push(`Missing required governance file: ${relativePath}`);
  }
}

if (failures.length === 0) {
  const readme = readText("README.md");
  const contributing = readText("CONTRIBUTING.md");
  const prTemplate = readText(".github/pull_request_template.md");
  const ci = readText(".github/workflows/ci.yml");

  const readmeLinks = [
    "docs/security-pr-review-checklist.md",
    "docs/route-pattern-guide.md",
    "docs/route-authorization-test-template.md",
    "docs/socket-review-checklist.md",
    "docs/page-data-exposure-checklist.md",
    "docs/quarterly-security-sweep-routine.md",
    "docs/contribution-review-workflow.md",
    "CONTRIBUTING.md",
  ];

  for (const link of readmeLinks) {
    if (!readme.includes(link)) {
      failures.push(`README.md is missing governance link: ${link}`);
    }
  }

  const contributionLinks = [
    "docs/security-pr-review-checklist.md",
    "docs/route-pattern-guide.md",
    "docs/route-authorization-test-template.md",
    "docs/socket-review-checklist.md",
    "docs/page-data-exposure-checklist.md",
    "docs/operational-safety-contract.md",
    "docs/error-code-contract.md",
  ];

  for (const link of contributionLinks) {
    if (!contributing.includes(link)) {
      failures.push(`CONTRIBUTING.md is missing governance link: ${link}`);
    }
  }

  const requiredPrTemplateLinks = [
    "docs/security-pr-review-checklist.md",
    "docs/route-pattern-guide.md",
    "docs/route-authorization-test-template.md",
    "docs/socket-review-checklist.md",
    "docs/page-data-exposure-checklist.md",
  ];

  for (const link of requiredPrTemplateLinks) {
    if (!prTemplate.includes(link)) {
      failures.push(`PR template is missing required review link: ${link}`);
    }
  }

  const requiredCiPhrases = [
    "npx tsc --noEmit",
    "npm run lint",
    "npm run test",
    "npx next build",
  ];

  for (const phrase of requiredCiPhrases) {
    if (!ci.includes(phrase)) {
      failures.push(`CI workflow is missing required verification step: ${phrase}`);
    }
  }
}

function walk(dir, matcher) {
  const absoluteDir = path.join(repoRoot, dir);
  const results = [];

  for (const entry of readdirSync(absoluteDir)) {
    const absolutePath = path.join(absoluteDir, entry);
    const relativePath = path.relative(repoRoot, absolutePath).replace(/\\/g, "/");
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      results.push(...walk(relativePath, matcher));
      continue;
    }

    if (matcher(relativePath)) {
      results.push(relativePath);
    }
  }

  return results;
}

const routeFiles = walk("src/app/api", (file) => file.endsWith("/route.ts"));
const testFiles = walk("src/__tests__", (file) => file.endsWith(".test.ts"));
const testContents = testFiles.map((file) => readText(file));

function isCoverageExempt(routeFile) {
  const content = readText(routeFile);

  if (routeFile === "src/app/api/auth/[...nextauth]/route.ts") {
    return true;
  }

  if (content.includes("Backward compatibility: redirect")) {
    return true;
  }

  if (content.includes("export const { GET, POST } = handlers")) {
    return true;
  }

  return false;
}

const unreferencedRoutes = routeFiles.filter((routeFile) => {
  if (isCoverageExempt(routeFile)) {
    return false;
  }
  const importPath = `@/${routeFile.replace(/^src\//, "").replace(/\.ts$/, "")}`;
  return !testContents.some((content) => content.includes(importPath));
});

if (unreferencedRoutes.length > 0) {
  advisories.push(
    `Routes without direct test imports detected (${unreferencedRoutes.length}). Review coverage:\n` +
      unreferencedRoutes.map((file) => `- ${file}`).join("\n")
  );
}

if (failures.length > 0) {
  console.error("Governance check failed:\n");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  if (advisories.length > 0) {
    console.error("\nAdvisories:\n");
    for (const advisory of advisories) {
      console.error(advisory);
    }
  }
  process.exit(1);
}

console.log("Governance check passed.");

if (advisories.length > 0) {
  console.log("\nAdvisories:\n");
  for (const advisory of advisories) {
    console.log(advisory);
  }
}
