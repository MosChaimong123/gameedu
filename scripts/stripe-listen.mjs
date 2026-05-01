/**
 * Runs Stripe CLI webhook forwarder without interactive `stripe login`.
 * Loads STRIPE_SECRET_KEY from .env.local and passes it via STRIPE_API_KEY (see Stripe CLI docs).
 *
 * On Windows, uses WinGet shim path when `stripe` is not on PATH.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./load-env-local.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const forwardUrl = "localhost:3000/api/webhooks/stripe";

function resolveStripeExecutable() {
  if (process.platform === "win32") {
    const base = process.env.LOCALAPPDATA;
    if (base) {
      const wingetStripe = path.join(base, "Microsoft", "WinGet", "Links", "stripe.exe");
      if (fs.existsSync(wingetStripe)) {
        return wingetStripe;
      }
    }
  }
  return "stripe";
}

loadEnvLocal();
const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
if (!stripeKey) {
  console.error(
    "[stripe-listen] Missing STRIPE_SECRET_KEY in .env.local.\n" +
      "Paste your secret key from Stripe Dashboard → Developers → API keys (sk_test_...)."
  );
  process.exit(1);
}

const bin = resolveStripeExecutable();
const child = spawn(bin, ["listen", "--forward-to", forwardUrl], {
  stdio: "inherit",
  shell: false,
  env: { ...process.env, STRIPE_API_KEY: stripeKey },
});

child.on("error", (err) => {
  console.error(
    "[stripe-listen] Could not start Stripe CLI.\n" +
      "Install: winget install Stripe.StripeCli\n",
    err.message
  );
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});
