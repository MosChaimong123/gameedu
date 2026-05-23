export type GameStatePatch = {
    gold?: number;
    inventory?: string[];
    equippedFrame?: string | null;
};

export function createGameStatePatch(input: GameStatePatch): GameStatePatch {
    return {
        ...(typeof input.gold === "number" ? { gold: Math.trunc(input.gold) } : {}),
        ...(input.inventory ? { inventory: [...input.inventory] } : {}),
        ...(Object.prototype.hasOwnProperty.call(input, "equippedFrame")
            ? { equippedFrame: input.equippedFrame ?? null }
            : {}),
    };
}
