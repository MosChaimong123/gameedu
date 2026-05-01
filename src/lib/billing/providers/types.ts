export type ThaiPlusInterval = "month" | "year";

export type StartThaiPlusInput = {
  userId: string;
  interval: ThaiPlusInterval;
  /** Prefer over env-based origin so redirects match how the user opened the app (host/port). */
  appOrigin?: string;
};

export type StartThaiPlusResult =
  | { ok: true; redirectUrl: string; pendingChargeId?: string }
  | { ok: false; message: string };

/** Contract for Thailand-facing PSP adapters (Omise / 2C2P / mock). */
export type ThaiBillingAdapter = {
  readonly id: string;
  startPlusPurchase(input: StartThaiPlusInput): Promise<StartThaiPlusResult>;
};
