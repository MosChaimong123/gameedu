export type NegamonLiteRng = {
    seed: number;
    next: () => number;
    nextInt: (min: number, max: number) => number;
    chance: (percent: number) => boolean;
};

export function createSeededRng(seed: number): NegamonLiteRng {
    let state = seed >>> 0;

    const next = () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };

    return {
        get seed() {
            return state;
        },
        next,
        nextInt: (min: number, max: number) => {
            const low = Math.ceil(min);
            const high = Math.floor(max);
            if (high < low) return low;
            return Math.floor(next() * (high - low + 1)) + low;
        },
        chance: (percent: number) => next() < Math.max(0, Math.min(100, percent)) / 100,
    };
}
