export type ThaiPlusInterval = "month" | "year";

/**
 * Payment method the user picked on the upgrade page. `promptpay` is the
 * default and works for every Thai bank via QR scan; the `mobile_*` codes
 * deep-link straight into a specific bank's app on mobile.
 */
export type ThaiPlusPaymentMethod =
  | "promptpay"
  | "mobile_banking_scb"
  | "mobile_banking_kbank"
  | "mobile_banking_bay"
  | "mobile_banking_bbl"
  | "mobile_banking_ktb";

export type StartThaiPlusInput = {
  userId: string;
  interval: ThaiPlusInterval;
  /** Prefer over env-based origin so redirects match how the user opened the app (host/port). */
  appOrigin?: string;
  paymentMethod?: ThaiPlusPaymentMethod;
};

export type StartThaiPlusResult =
  | { ok: true; redirectUrl: string; pendingChargeId?: string }
  | { ok: false; message: string };

/** Contract for dev-only mock Thai billing (`BILLING_THAI_PROVIDER=mock`). Production uses Stripe PromptPay. */
export type ThaiBillingAdapter = {
  readonly id: string;
  startPlusPurchase(input: StartThaiPlusInput): Promise<StartThaiPlusResult>;
};
