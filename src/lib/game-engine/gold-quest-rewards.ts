import { ChestReward, ChestRewardType } from "../types/game";

const REWARD_WEIGHTS: { type: ChestRewardType; weight: number }[] = [
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

export function generateChestReward(): ChestReward {
  const totalWeight = REWARD_WEIGHTS.reduce((acc, item) => acc + item.weight, 0);
  let random = Math.random() * totalWeight;

  let selectedType: ChestRewardType = "GOLD";
  for (const item of REWARD_WEIGHTS) {
    if (random < item.weight) {
      selectedType = item.type;
      break;
    }
    random -= item.weight;
  }

  switch (selectedType) {
    case "GOLD": {
      const amount = GOLD_AMOUNTS[Math.floor(Math.random() * GOLD_AMOUNTS.length)];
      return { type: "GOLD", value: amount, label: `+${amount}` };
    }
    case "MULTIPLIER": {
      const multi = Math.random() < 0.7 ? 2 : 3;
      return { type: "MULTIPLIER", value: multi, label: `x${multi} Gold` };
    }
    case "LOSE_GOLD": {
      const lose = LOSE_PERCENTAGES[Math.floor(Math.random() * LOSE_PERCENTAGES.length)];
      return { type: "LOSE_GOLD", value: lose, label: `Lose ${lose}%` };
    }
    case "SWAP":
      return { type: "SWAP", value: 0, label: "Swap!" };
    case "STEAL": {
      const percent = STEAL_PERCENTAGES[Math.floor(Math.random() * STEAL_PERCENTAGES.length)];
      return { type: "STEAL", value: percent, label: "Steal" };
    }
    default:
      return { type: "NOTHING", value: 0, label: "Nothing" };
  }
}
