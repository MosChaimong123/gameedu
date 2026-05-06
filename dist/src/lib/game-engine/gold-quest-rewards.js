"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateChestReward = generateChestReward;
const REWARD_WEIGHTS = [
    { type: "GOLD", weight: 40 },
    { type: "NOTHING", weight: 10 },
    { type: "LOSE_GOLD", weight: 15 },
    { type: "MULTIPLIER", weight: 15 },
    { type: "SWAP", weight: 5 },
    { type: "STEAL", weight: 15 },
];
const GOLD_AMOUNTS = [10, 20, 50, 100, 200, 500];
const STEAL_PERCENTAGES = [10, 25];
const LOSE_PERCENTAGES = [10, 25];
function hashString(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
/** Deterministic PRNG for chest rewards (same salt + index → same roll). */
function mulberry32(seed) {
    return () => {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function generateChestReward(opts) {
    const { seedSalt, chestIndex } = opts;
    const rng = mulberry32(hashString(`${seedSalt}:${chestIndex}`));
    const totalWeight = REWARD_WEIGHTS.reduce((acc, item) => acc + item.weight, 0);
    let random = rng() * totalWeight;
    let selectedType = "GOLD";
    for (const item of REWARD_WEIGHTS) {
        if (random < item.weight) {
            selectedType = item.type;
            break;
        }
        random -= item.weight;
    }
    switch (selectedType) {
        case "GOLD": {
            const amount = GOLD_AMOUNTS[Math.floor(rng() * GOLD_AMOUNTS.length)];
            return { type: "GOLD", value: amount, label: `+${amount}` };
        }
        case "MULTIPLIER": {
            const multi = rng() < 0.7 ? 2 : 3;
            return { type: "MULTIPLIER", value: multi, label: `x${multi} Gold` };
        }
        case "LOSE_GOLD": {
            const lose = LOSE_PERCENTAGES[Math.floor(rng() * LOSE_PERCENTAGES.length)];
            return { type: "LOSE_GOLD", value: lose, label: `Lose ${lose}%` };
        }
        case "SWAP":
            return { type: "SWAP", value: 0, label: "Swap!" };
        case "STEAL": {
            const percent = STEAL_PERCENTAGES[Math.floor(rng() * STEAL_PERCENTAGES.length)];
            return { type: "STEAL", value: percent, label: "Steal" };
        }
        default:
            return { type: "NOTHING", value: 0, label: "Nothing" };
    }
}
