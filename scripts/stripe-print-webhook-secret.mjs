/**
 * Prints the webhook signing secret for the current Stripe CLI listen session (whsec_...).
 * Requires STRIPE_SECRET_KEY in .env.local — no interactive stripe login.
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
  console.error("[stripe-print-webhook-secret] Set STRIPE_SECRET_KEY in .env.local (sk_test_...).");
  process.exit(1);
}

const bin = resolveStripeExecutable();
const child = spawn(bin, ["listen", "--print-secret"], {
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
