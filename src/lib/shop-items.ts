export type ShopItemType = "frame" | "battle_item";
export type ShopItemRarity = "common" | "rare" | "epic" | "legendary";

/** Sub-groups inside the battle-items shop block (easier browsing). */
export type ShopBattleItemCategory = "stat_boost" | "status" | "reward";

export const BATTLE_ITEM_CATEGORY_ORDER: ShopBattleItemCategory[] = [
    "stat_boost",
    "status",
    "reward",
];

export interface FramePreview {
    borderColor: string;
    shadow?: string;
    /** CSS gradient string — applied as background on the border ring when animate is needed */
    gradient?: string;
}

export interface BattleEffect {
    /** Stat multipliers applied at battle start (e.g. 1.15 = +15%) */
    statBoost?: { atk?: number; def?: number; spd?: number };
    /** Status effects this item grants immunity to */
    immunity?: string[];
    /** Bonus gold added to reward if this fighter wins (before multiplier) */
    goldBonus?: number;
    /** Multiplier on total gold reward if this fighter wins (applied after flat bonus) */
    goldMultiplier?: number;
}

export interface ShopItem {
    id: string;
    type: ShopItemType;
    price: number;
    rarity: ShopItemRarity;
    icon?: string;           // emoji — used by battle_item type
    preview?: FramePreview;  // used by frame type
    battleEffect?: BattleEffect;
    /** When `type` is `battle_item`, used to group rows in the shop dialog. */
    battleCategory?: ShopBattleItemCategory;
}

export function shopItemNameKey(id: string): string {
    return `shopItem_${id}_name`;
}

export function shopItemDescKey(id: string): string {
    return `shopItem_${id}_desc`;
}

export const RARITY_COLOR: Record<ShopItemRarity, string> = {
    common: "#94a3b8",
    rare: "#3b82f6",
    epic: "#8b5cf6",
    legendary: "#f59e0b",
};

/** Gold/hour multiplier by equipped frame rarity. */
export const FRAME_GOLD_RATE_MULTIPLIER_BY_RARITY: Record<ShopItemRarity, number> = {
    common: 1.05,
    rare: 1.1,
    epic: 1.2,
    legendary: 1.35,
};

const RARITY_ORDER: Record<ShopItemRarity, number> = {
    common: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
};

export const BATTLE_ITEMS: ShopItem[] = [
    // ── DEF tiers ──
    {
        id: "item_buckler",
        type: "battle_item",
        price: 100,
        rarity: "common",
        icon: "🥏",
        battleCategory: "stat_boost",
        battleEffect: { statBoost: { def: 1.08 } },
    },
    {
        id: "item_iron_shield",
        type: "battle_item",
        price: 1000,
        rarity: "rare",
        icon: "🛡️",
        battleCategory: "stat_boost",
        battleEffect: { statBoost: { def: 1.15 } },
    },
    {
        id: "item_aegis_plate",
        type: "battle_item",
        price: 5000,
        rarity: "epic",
        icon: "🔰",
        battleCategory: "stat_boost",
        battleEffect: { statBoost: { def: 1.22 } },
    },
    // ── SPD tiers ──
    {
        id: "item_wind_thread",
        type: "battle_item",
        price: 100,
        rarity: "common",
        icon: "🎗️",
        battleCategory: "stat_boost",
        battleEffect: { statBoost: { spd: 1.10 } },
    },
    {
        id: "item_swift_feather",
        type: "battle_item",
        price: 1000,
        rarity: "rare",
        icon: "🪶",
        battleCategory: "stat_boost",
        battleEffect: { statBoost: { spd: 1.20 } },
    },
    {
        id: "item_gale_plume",
        type: "battle_item",
        price: 5000,
        rarity: "epic",
        icon: "🪁",
        battleCategory: "stat_boost",
        battleEffect: { statBoost: { spd: 1.28 } },
    },
    // ── ATK tiers ──
    {
        id: "item_spark_charm",
        type: "battle_item",
        price: 100,
        rarity: "common",
        icon: "✳️",
        battleCategory: "stat_boost",
        battleEffect: { statBoost: { atk: 1.08 } },
    },
    {
        id: "item_ember_charm",
        type: "battle_item",
        price: 1000,
        rarity: "rare",
        icon: "🔮",
        battleCategory: "stat_boost",
        battleEffect: { statBoost: { atk: 1.15 } },
    },
    {
        id: "item_inferno_talisman",
        type: "battle_item",
        price: 5000,
        rarity: "epic",
        icon: "🔥",
        battleCategory: "stat_boost",
        battleEffect: { statBoost: { atk: 1.22 } },
    },
    {
        id: "item_lucky_coin",
        type: "battle_item",
        price: 5000,
        rarity: "epic",
        icon: "🪙",
        battleCategory: "reward",
        battleEffect: { goldBonus: 15 },
    },
    {
        id: "item_merchants_sigil",
        type: "battle_item",
        price: 5000,
        rarity: "legendary",
        icon: "✨",
        battleCategory: "reward",
        battleEffect: { goldMultiplier: 1.25 },
    },
];

export function groupBattleItemsByCategory(
    items: ShopItem[]
): { category: ShopBattleItemCategory; items: ShopItem[] }[] {
    const map = new Map<ShopBattleItemCategory, ShopItem[]>();
    for (const c of BATTLE_ITEM_CATEGORY_ORDER) {
        map.set(c, []);
    }
    for (const item of items) {
        if (item.type !== "battle_item") continue;
        const cat = item.battleCategory ?? "stat_boost";
        map.get(cat)?.push(item);
    }
    for (const cat of BATTLE_ITEM_CATEGORY_ORDER) {
        map.get(cat)?.sort((a, b) => {
            const byRarity = RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
            if (byRarity !== 0) return byRarity;
            const byPrice = a.price - b.price;
            if (byPrice !== 0) return byPrice;
            return a.id.localeCompare(b.id);
        });
    }
    return BATTLE_ITEM_CATEGORY_ORDER.map((category) => ({
        category,
        items: map.get(category) ?? [],
    })).filter((g) => g.items.length > 0);
}

export const SHOP_ITEMS: ShopItem[] = [
    {
        id: "frame_silver",
        type: "frame",
        price: 100,
        rarity: "common",
        preview: {
            borderColor: "#94a3b8",
            shadow: "0 0 12px rgba(148,163,184,0.6)",
        },
    },
    {
        id: "frame_gold",
        type: "frame",
        price: 1000,
        rarity: "rare",
        preview: {
            borderColor: "#f59e0b",
            shadow: "0 0 18px rgba(245,158,11,0.7)",
        },
    },
    {
        id: "frame_emerald",
        type: "frame",
        price: 1000,
        rarity: "rare",
        preview: {
            borderColor: "#10b981",
            shadow: "0 0 18px rgba(16,185,129,0.7)",
        },
    },
    {
        id: "frame_amethyst",
        type: "frame",
        price: 5000,
        rarity: "epic",
        preview: {
            borderColor: "#8b5cf6",
            shadow: "0 0 22px rgba(139,92,246,0.8)",
        },
    },
    {
        id: "frame_dragon",
        type: "frame",
        price: 10000,
        rarity: "legendary",
        preview: {
            borderColor: "#f97316",
            shadow: "0 0 28px rgba(249,115,22,0.9)",
            gradient: "linear-gradient(135deg,#ef4444,#f97316,#fbbf24)",
        },
    },
    {
        id: "frame_sakura",
        type: "frame",
        price: 100,
        rarity: "common",
        preview: {
            borderColor: "#f472b6",
            shadow: "0 0 14px rgba(244,114,182,0.6)",
        },
    },
    {
        id: "frame_ruby",
        type: "frame",
        price: 1000,
        rarity: "rare",
        preview: {
            borderColor: "#dc2626",
            shadow: "0 0 18px rgba(220,38,38,0.7)",
        },
    },
    {
        id: "frame_ocean",
        type: "frame",
        price: 5000,
        rarity: "epic",
        preview: {
            borderColor: "#0ea5e9",
            shadow: "0 0 22px rgba(14,165,233,0.8)",
            gradient: "linear-gradient(135deg,#0ea5e9,#6366f1,#8b5cf6)",
        },
    },
    {
        id: "frame_lightning",
        type: "frame",
        price: 5000,
        rarity: "epic",
        preview: {
            borderColor: "#eab308",
            shadow: "0 0 24px rgba(234,179,8,0.9)",
            gradient: "linear-gradient(135deg,#facc15,#f97316,#eab308)",
        },
    },
    {
        id: "frame_cosmic",
        type: "frame",
        price: 10000,
        rarity: "legendary",
        preview: {
            borderColor: "#a855f7",
            shadow: "0 0 32px rgba(168,85,247,1)",
            gradient: "linear-gradient(135deg,#ec4899,#a855f7,#6366f1,#0ea5e9,#10b981)",
        },
    },
];

export function getItemById(id: string): ShopItem | undefined {
    return [...SHOP_ITEMS, ...BATTLE_ITEMS].find((i) => i.id === id);
}

export function getBattleItemById(id: string): ShopItem | undefined {
    return BATTLE_ITEMS.find((i) => i.id === id);
}

export function getFrameGoldRateMultiplierById(frameId: string | null | undefined): number {
    if (!frameId) return 1;
    const frame = SHOP_ITEMS.find((i) => i.type === "frame" && i.id === frameId);
    if (!frame) return 1;
    return FRAME_GOLD_RATE_MULTIPLIER_BY_RARITY[frame.rarity] ?? 1;
}

export const ALL_ITEMS: ShopItem[] = [...SHOP_ITEMS, ...BATTLE_ITEMS];
