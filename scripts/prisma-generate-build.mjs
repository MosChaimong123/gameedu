import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const isWindows = process.platform === "win32";

function commandLabel(command, args) {
  return [command, ...args].join(" ");
}

function runCommand(command, args) {
  if (process.platform === "win32") {
    const escapedArgs = args.map((arg) => (
      /^[A-Za-z0-9_./:-]+$/.test(arg)
        ? arg
        : `"${arg.replace(/"/g, '\\"')}"`
    ));
    return spawnSync("cmd.exe", ["/d", "/s", "/c", `${command} ${escapedArgs.join(" ")}`], {
      stdio: "pipe",
      encoding: "utf8",
      shell: false,
    });
  }

  return spawnSync(command, args, {
    stdio: "pipe",
    encoding: "utf8",
    shell: false,
  });
}

function writeOutput(result) {
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}

function hasPrismaEngineLock(result) {
  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return combined.includes("query_engine-windows.dll.node") && combined.includes("EPERM");
}

function hasExistingPrismaClient() {
  const clientDir = path.join(process.cwd(), "node_modules", ".prisma", "client");
  return (
    existsSync(path.join(clientDir, "query_engine-windows.dll.node")) &&
    existsSync(path.join(clientDir, "index.js")) &&
    existsSync(path.join(clientDir, "schema.prisma"))
  );
}

function exitWith(result, command, args) {
  writeOutput(result);

  if (result.error) {
    console.error(`Failed to run ${commandLabel(command, args)}: ${result.error.message}`);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

const primaryCommand = isWindows ? "npx.cmd" : "npx";
const primaryArgs = ["prisma", "generate"];
const primaryResult = runCommand(primaryCommand, primaryArgs);

if ((primaryResult.status ?? 1) === 0) {
  writeOutput(primaryResult);
  process.exit(0);
}

if (!isWindows || !hasPrismaEngineLock(primaryResult)) {
  exitWith(primaryResult, primaryCommand, primaryArgs);
}

writeOutput(primaryResult);
console.warn(
  "Prisma generate hit a Windows engine lock. Retrying with the repository unlock script."
);

const fallbackCommand = isWindows ? "npm.cmd" : "npm";
const fallbackArgs = ["run", "prisma:regen"];
const fallbackResult = runCommand(fallbackCommand, fallbackArgs);

if ((fallbackResult.status ?? 1) === 0) {
  exitWith(fallbackResult, fallbackCommand, fallbackArgs);
}

if (hasPrismaEngineLock(fallbackResult) && hasExistingPrismaClient()) {
  writeOutput(fallbackResult);
  console.warn(
    "Prisma engine remains locked on Windows, but an existing generated client is present. Continuing the build with the current client."
  );
  process.exit(0);
}

exitWith(fallbackResult, fallbackCommand, fallbackArgs);
