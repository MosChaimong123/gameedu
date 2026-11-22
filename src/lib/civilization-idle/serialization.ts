import { createHash } from "crypto";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)])
    );
  }
  return value;
}

export function stableCivilizationJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function hashCivilizationCommand(value: unknown): string {
  return createHash("sha256").update(stableCivilizationJson(value), "utf8").digest("hex");
}
