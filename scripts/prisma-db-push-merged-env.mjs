/**
 * Runs `prisma db push` with the same env merge as other CLI scripts (.env then .env.local).
 */
import "./load-env-for-cli.mjs";
import { spawnSync } from "node:child_process";

const extra = process.argv.slice(2);
const r = spawnSync("npx", ["prisma", "db", "push", ...extra], {
  stdio: "inherit",
  cwd: process.cwd(),
  env: process.env,
  shell: true,
});
process.exit(r.status ?? 1);
