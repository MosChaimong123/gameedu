export type ShopItemType = "frame" | "battle_item";
export type ShopItemRarity = "common" | "rare" | "epic" | "legendary";

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
    /** Bonus gold added to reward if this fighter wins */
    goldBonus?: number;
}

export interface ShopItem {
    id: string;
    type: ShopItemType;
    price: number;
    rarity: ShopItemRarity;
    icon?: string;           // emoji — used by battle_item type
    preview?: FramePreview;  // used by frame type
    battleEffect?: BattleEffect;
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

export const BATTLE_ITEMS: ShopItem[] = [
    {
        id: "item_iron_shield",
        type: "battle_item",
        price: 120,
        rarity: "rare",
        icon: "🛡️",
        battleEffect: { statBoost: { def: 1.15 } },
    },
    {
        id: "item_swift_feather",
        type: "battle_item",
        price: 120,
        rarity: "rare",
        icon: "🪶",
        battleEffect: { statBoost: { spd: 1.20 } },
    },
    {
        id: "item_ember_charm",
        type: "battle_item",
        price: 120,
        rarity: "rare",
        icon: "🔮",
        battleEffect: { statBoost: { atk: 1.15 } },
    },
    {
        id: "item_antidote",
        type: "battle_item",
        price: 80,
        rarity: "common",
        icon: "💊",
        battleEffect: { immunity: ["POISON", "BADLY_POISON"] },
    },
    {
        id: "item_lucky_coin",
        type: "battle_item",
        price: 200,
        rarity: "epic",
        icon: "🪙",
        battleEffect: { goldBonus: 15 },
    },
];

export const SHOP_ITEMS: ShopItem[] = [
    {
        id: "frame_silver",
        type: "frame",
        price: 50,
        rarity: "common",
        preview: {
            borderColor: "#94a3b8",
            shadow: "0 0 12px rgba(148,163,184,0.6)",
        },
    },
    {
        id: "frame_gold",
        type: "frame",
        price: 150,
        rarity: "rare",
        preview: {
            borderColor: "#f59e0b",
            shadow: "0 0 18px rgba(245,158,11,0.7)",
        },
    },
    {
        id: "frame_emerald",
        type: "frame",
        price: 250,
        rarity: "rare",
        preview: {
            borderColor: "#10b981",
            shadow: "0 0 18px rgba(16,185,129,0.7)",
        },
    },
    {
        id: "frame_amethyst",
        type: "frame",
        price: 400,
        rarity: "epic",
        preview: {
            borderColor: "#8b5cf6",
            shadow: "0 0 22px rgba(139,92,246,0.8)",
        },
    },
    {
        id: "frame_dragon",
        type: "frame",
        price: 800,
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
        price: 80,
        rarity: "common",
        preview: {
            borderColor: "#f472b6",
            shadow: "0 0 14px rgba(244,114,182,0.6)",
        },
    },
    {
        id: "frame_ruby",
        type: "frame",
        price: 200,
        rarity: "rare",
        preview: {
            borderColor: "#dc2626",
            shadow: "0 0 18px rgba(220,38,38,0.7)",
        },
    },
    {
        id: "frame_ocean",
        type: "frame",
        price: 350,
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
        price: 450,
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
        price: 1200,
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

export const ALL_ITEMS: ShopItem[] = [...SHOP_ITEMS, ...BATTLE_ITEMS];
