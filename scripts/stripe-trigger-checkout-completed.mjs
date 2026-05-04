/**
 * Sends a test checkout.session.completed event via Stripe CLI (sandbox).
 * Requires STRIPE_SECRET_KEY in .env.local — forwards through `stripe listen` if running.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadEnvLocal } from "./load-env-local.mjs";

function resolveStripeExecutable() {
  if (process.platform === "win32") {
    const base = process.env.LOCALAPPDATA;
    if (base) {
      const wingetStripe = path.join(base, "Microsoft", "WinGet", "Links", "stripe.exe");
      if (fs.existsSync(wingetStripe)) return wingetStripe;
    }
  }
  return "stripe";
}

loadEnvLocal();
const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
if (!stripeKey) {
  console.error("Set STRIPE_SECRET_KEY in .env.local.");
  process.exit(1);
}

const bin = resolveStripeExecutable();
const child = spawn(bin, ["trigger", "checkout.session.completed"], {
  stdio: "inherit",
  shell: false,
  env: { ...process.env, STRIPE_API_KEY: stripeKey },
});

child.on("error", (err) => {
  console.error(err.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});
