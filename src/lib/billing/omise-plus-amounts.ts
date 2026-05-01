import type { AppEnv } from "@/lib/env";
import type { ThaiPlusInterval } from "@/lib/billing/providers/types";

/** Defaults align with UI fallback (฿290/mo). Override with OMISE_PLUS_*_SATANG (satang string in env). */
const DEFAULT_MONTHLY_SATANG = 29_000;

function parseSatang(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n >= 2000 ? n : fallback;
}

export function resolveOmisePlusAmountSatang(
  interval: ThaiPlusInterval,
  env: AppEnv
): number {
  const monthly = parseSatang(env.OMISE_PLUS_MONTHLY_SATANG, DEFAULT_MONTHLY_SATANG);
  const yearlyFallback = monthly * 12;
  const yearly = parseSatang(env.OMISE_PLUS_YEARLY_SATANG, yearlyFallback);
  return interval === "month" ? monthly : yearly;
}
