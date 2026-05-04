export type ShopItemType = "frame" | "battle_item";
export type ShopItemRarity = "common" | "rare" | "epic" | "legendary";

/** Sub-groups inside the battle-items shop block (easier browsing). */
export type ShopBattleItemCategory = "stat_boost" | "status" | "reward";

export const BATTLE_ITEM_CATEGORY_ORDER: ShopBattleItemCategory[] = [
    "stat_boost",
    "status",
    "reward",
];

/** Visual tier DNA for profile frames (distinct silhouette per level). */
export type FrameTierVariant = "t1_minimal" | "t2_dual" | "t3_ascendant" | "t4_sovereign";

export interface FramePreview {
    borderColor: string;
    shadow?: string;
    /** CSS gradient — ring / card bezel fill */
    gradient?: string;
    variant: FrameTierVariant;
    /** Outer bezel width in px */
    borderWidthPx: number;
    /** Secondary glow layer (concat with shadow where supported) */
    haloShadow?: string;
    /** T4: rotating conic under bezel */
    animated?: boolean;
    conicGradient?: string;
}

function hexToRgba(hex: string, alpha: number): string {
    let h = hex.replace("#", "").trim();
    if (h.length === 3) {
        h = h
            .split("")
            .map((c) => c + c)
            .join("");
    }
    const n = parseInt(h, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},${alpha})`;
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
    /** Optional elemental theme metadata for profile frame items */
    frameElement?: FrameElement;
    frameTier?: 1 | 2 | 3 | 4;
}

export type FrameElement = "fire" | "water" | "earth" | "wind" | "thunder" | "light" | "dark";

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

const FRAME_TIER_META: Array<{ tier: 1 | 2 | 3 | 4; rarity: ShopItemRarity; price: number }> = [
    { tier: 1, rarity: "common", price: 100 },
    { tier: 2, rarity: "rare", price: 1000 },
    { tier: 3, rarity: "epic", price: 5000 },
    { tier: 4, rarity: "legendary", price: 10000 },
];

const FRAME_ELEMENT_PALETTES: Record<
    FrameElement,
    { thName: string; enName: string; c1: string; c2: string; c3: string }
> = {
    fire: { thName: "เพลิง", enName: "Fire", c1: "#ef4444", c2: "#f97316", c3: "#fbbf24" },
    water: { thName: "วารี", enName: "Water", c1: "#0ea5e9", c2: "#3b82f6", c3: "#6366f1" },
    earth: { thName: "ปฐพี", enName: "Earth", c1: "#65a30d", c2: "#16a34a", c3: "#a3e635" },
    wind: { thName: "วายุ", enName: "Wind", c1: "#14b8a6", c2: "#22d3ee", c3: "#67e8f9" },
    thunder: { thName: "อสนี", enName: "Thunder", c1: "#eab308", c2: "#f59e0b", c3: "#fde047" },
    light: { thName: "แสง", enName: "Light", c1: "#f59e0b", c2: "#facc15", c3: "#fff7ae" },
    dark: { thName: "เงา", enName: "Dark", c1: "#7c3aed", c2: "#4c1d95", c3: "#a855f7" },
};

function framePreviewForTier(c1: string, c2: string, c3: string, tier: 1 | 2 | 3 | 4): FramePreview {
    if (tier === 1) {
        return {
            variant: "t1_minimal",
            borderColor: c1,
            borderWidthPx: 2,
            shadow: `0 0 14px ${hexToRgba(c1, 0.38)}`,
        };
    }
    if (tier === 2) {
        return {
            variant: "t2_dual",
            borderColor: c2,
            borderWidthPx: 3,
            gradient: `linear-gradient(138deg, ${c1} 0%, ${c2} 45%, ${c3} 100%)`,
            shadow: `0 0 18px ${hexToRgba(c2, 0.48)}, inset 0 0 0 1px ${hexToRgba(c1, 0.28)}`,
            haloShadow: `0 4px 12px ${hexToRgba(c1, 0.18)}`,
        };
    }
    if (tier === 3) {
        return {
            variant: "t3_ascendant",
            borderColor: c2,
            borderWidthPx: 4,
            gradient: `linear-gradient(154deg, ${c1} 0%, ${c2} 34%, ${c3} 62%, ${c1} 100%)`,
            shadow: `0 0 28px ${hexToRgba(c2, 0.52)}`,
            haloShadow: `0 0 48px ${hexToRgba(c1, 0.24)}, 0 0 72px ${hexToRgba(c3, 0.14)}`,
        };
    }
    return {
        variant: "t4_sovereign",
        borderColor: c3,
        borderWidthPx: 5,
        gradient: `linear-gradient(168deg, ${c1} 0%, ${c3} 26%, ${c2} 48%, ${c3} 72%, ${c1} 100%)`,
        shadow: `0 0 36px ${hexToRgba(c3, 0.58)}`,
        haloShadow: `0 0 64px ${hexToRgba(c1, 0.3)}, 0 0 96px ${hexToRgba(c2, 0.2)}`,
        animated: true,
        conicGradient: `conic-gradient(from 0deg, ${c1}, ${c3}, ${c2}, ${c3}, ${c1})`,
    };
}

const FRAME_ELEMENTS: FrameElement[] = ["fire", "water", "earth", "wind", "thunder", "light", "dark"];

export const SHOP_ITEMS: ShopItem[] = FRAME_ELEMENTS.flatMap((element) => {
    const palette = FRAME_ELEMENT_PALETTES[element];
    return FRAME_TIER_META.map(({ tier, rarity, price }) => ({
        id: `frame_${element}_t${tier}`,
        type: "frame" as const,
        price,
        rarity,
        frameElement: element,
        frameTier: tier,
        preview: framePreviewForTier(palette.c1, palette.c2, palette.c3, tier),
    }));
});

const FRAME_TIER_NAME_TH: Record<1 | 2 | 3 | 4, string> = {
    1: "กำเนิด",
    2: "ขัดเกลา",
    3: "อัญเชิญ",
    4: "จักรพรรดิ",
};
const FRAME_TIER_NAME_EN: Record<1 | 2 | 3 | 4, string> = {
    1: "Initiate",
    2: "Refined",
    3: "Ascendant",
    4: "Sovereign",
};

export function getFallbackShopItemName(id: string, locale: "th" | "en"): string {
    const match = /^frame_(fire|water|earth|wind|thunder|light|dark)_t([1-4])$/.exec(id);
    if (!match) return id;
    const element = match[1] as FrameElement;
    const palette = FRAME_ELEMENT_PALETTES[element];
    if (locale === "th") return `กรอบ${palette.thName}`;
    return `${palette.enName} Frame`;
}

export function getFallbackShopItemDesc(id: string, locale: "th" | "en"): string {
    const match = /^frame_(fire|water|earth|wind|thunder|light|dark)_t([1-4])$/.exec(id);
    if (!match) return "";
    const element = match[1] as FrameElement;
    const tier = Number(match[2]) as 1 | 2 | 3 | 4;
    const elementTh = FRAME_ELEMENT_PALETTES[element].thName;
    const elementEn = FRAME_ELEMENT_PALETTES[element].enName;
    if (locale === "th") {
        return `กรอบพลังธาตุ${elementTh} ระดับ ${tier} ดีไซน์ประกายชั้น ${FRAME_TIER_NAME_TH[tier]} เน้นความหรูมินิมอล`;
    }
    return `${elementEn} elemental frame in tier ${tier} (${FRAME_TIER_NAME_EN[tier]}), designed with a premium minimal glow.`;
}

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
