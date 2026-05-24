export type NegamonDeterministicRng = {
    readonly seed: number;
    readonly cursor: number;
};

const MODULUS = 0x100000000;
const MULTIPLIER = 1664525;
const INCREMENT = 1013904223;

function normalizeSeed(seed: number): number {
    if (!Number.isFinite(seed)) return 1;
    return (Math.abs(Math.trunc(seed)) % MODULUS) || 1;
}

export function createDeterministicRng(seed: number, cursor = 0): NegamonDeterministicRng {
    return {
        seed: normalizeSeed(seed),
        cursor: Math.max(0, Math.trunc(cursor)),
    };
}

export function advanceDeterministicRng(rng: NegamonDeterministicRng): {
    rng: NegamonDeterministicRng;
    value01: number;
} {
    const nextSeed = (rng.seed * MULTIPLIER + INCREMENT) % MODULUS;
    return {
        rng: { seed: nextSeed, cursor: rng.cursor + 1 },
        value01: nextSeed / MODULUS,
    };
}

export function rollPercent(
    rng: NegamonDeterministicRng,
    percent: number
): { rng: NegamonDeterministicRng; success: boolean; rolled: number } {
    const { rng: nextRng, value01 } = advanceDeterministicRng(rng);
    const rolled = value01 * 100;
    return {
        rng: nextRng,
        success: rolled < Math.max(0, Math.min(100, percent)),
        rolled,
    };
}

export function rollDamageBand(
    rng: NegamonDeterministicRng,
    minimum = 0.85,
    maximum = 1
): { rng: NegamonDeterministicRng; multiplier: number } {
    const { rng: nextRng, value01 } = advanceDeterministicRng(rng);
    return {
        rng: nextRng,
        multiplier: minimum + (maximum - minimum) * value01,
    };
}
