export type ShopItemType = "frame" | "battle_item";
export type ShopItemRarity = "common" | "rare" | "epic" | "legendary";

export type ShopBattleItemCategory = "held" | "usable" | "reward";

export const BATTLE_ITEM_CATEGORY_ORDER: ShopBattleItemCategory[] = [
    "held",
    "usable",
    "reward",
];

export type FrameTierVariant = "t1_minimal" | "t2_dual" | "t3_ascendant" | "t4_sovereign";

export interface FramePreview {
    borderColor: string;
    shadow?: string;
    gradient?: string;
    variant: FrameTierVariant;
    borderWidthPx: number;
    haloShadow?: string;
    animated?: boolean;
    conicGradient?: string;
}

function hexToRgba(hex: string, alpha: number): string {
    let h = hex.replace("#", "").trim();
    if (h.length === 3) {
        h = h.split("").map((c) => c + c).join("");
    }
    const n = parseInt(h, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},${alpha})`;
}

export interface BattleEffect {
    statBoost?: { atk?: number; def?: number; spd?: number };
    immunity?: string[];
    restoreHpPercent?: number;
    restoreEnergy?: number;
    goldBonus?: number;
    goldMultiplier?: number;
    expMultiplier?: number;
    critBonusPercent?: number;
    damageTakenMultiplier?: number;
    energyRegen?: number;
}

export interface ShopItem {
    id: string;
    type: ShopItemType;
    price: number;
    rarity: ShopItemRarity;
    icon?: string;
    preview?: FramePreview;
    battleEffect?: BattleEffect;
    battleCategory?: ShopBattleItemCategory;
    battleKind?: "held" | "usable" | "reward";
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

/** Frames and held (wearable) battle items can only be bought once per student. */
export function isSinglePurchaseShopItem(
    item: Pick<ShopItem, "type" | "battleCategory">
): boolean {
    if (item.type === "frame") return true;
    return item.type === "battle_item" && item.battleCategory === "held";
}

export const RARITY_COLOR: Record<ShopItemRarity, string> = {
    common: "#94a3b8",
    rare: "#3b82f6",
    epic: "#8b5cf6",
    legendary: "#f59e0b",
};

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
    {
        id: "held_guard_core",
        type: "battle_item",
        price: 1200,
        rarity: "rare",
        icon: "🛡️",
        battleCategory: "held",
        battleKind: "held",
        battleEffect: { damageTakenMultiplier: 0.9 },
    },
    {
        id: "held_swift_anklet",
        type: "battle_item",
        price: 1000,
        rarity: "rare",
        icon: "🪽",
        battleCategory: "held",
        battleKind: "held",
        battleEffect: { statBoost: { spd: 1.18 } },
    },
    {
        id: "held_scope_prism",
        type: "battle_item",
        price: 5000,
        rarity: "epic",
        icon: "🔷",
        battleCategory: "held",
        battleKind: "held",
        battleEffect: { critBonusPercent: 18 },
    },
    {
        id: "held_echo_battery",
        type: "battle_item",
        price: 900,
        rarity: "common",
        icon: "🔋",
        battleCategory: "held",
        battleKind: "held",
        battleEffect: { energyRegen: 12 },
    },
    {
        id: "held_clear_mind_charm",
        type: "battle_item",
        price: 1100,
        rarity: "rare",
        icon: "🧿",
        battleCategory: "held",
        battleKind: "held",
        battleEffect: { immunity: ["POISON", "BURN", "SLEEP"] },
    },
    {
        id: "use_vital_vial",
        type: "battle_item",
        price: 150,
        rarity: "common",
        icon: "🧪",
        battleCategory: "usable",
        battleKind: "usable",
        battleEffect: { restoreHpPercent: 25 },
    },
    {
        id: "use_charge_capsule",
        type: "battle_item",
        price: 250,
        rarity: "common",
        icon: "🔋",
        battleCategory: "usable",
        battleKind: "usable",
        battleEffect: { restoreEnergy: 18 },
    },
    {
        id: "reward_lucky_coin",
        type: "battle_item",
        price: 5000,
        rarity: "epic",
        icon: "🪙",
        battleCategory: "reward",
        battleKind: "reward",
        battleEffect: { goldBonus: 15 },
    },
    {
        id: "reward_scholar_seal",
        type: "battle_item",
        price: 5000,
        rarity: "rare",
        icon: "📜",
        battleCategory: "reward",
        battleKind: "reward",
        battleEffect: { expMultiplier: 1.2 },
    },
    {
        id: "reward_trait_crystal",
        type: "battle_item",
        price: 7500,
        rarity: "epic",
        icon: "💎",
        battleCategory: "reward",
        battleKind: "reward",
    },
];

export const LEGACY_BATTLE_ITEM_ALIASES: Record<string, string> = {
    item_buckler: "held_guard_core",
    item_iron_shield: "held_guard_core",
    item_aegis_plate: "held_guard_core",
    item_wind_thread: "held_swift_anklet",
    item_swift_feather: "held_swift_anklet",
    item_gale_plume: "held_swift_anklet",
    item_spark_charm: "held_scope_prism",
    item_ember_charm: "held_scope_prism",
    item_inferno_talisman: "held_scope_prism",
    item_minor_potion: "use_vital_vial",
    item_energy_orb: "use_charge_capsule",
    item_antidote_charm: "held_clear_mind_charm",
    item_flame_ward: "held_clear_mind_charm",
    item_dream_bell: "held_clear_mind_charm",
    item_lucky_coin: "reward_lucky_coin",
    item_merchants_sigil: "reward_lucky_coin",
};

export function resolveLegacyBattleItemId(id: string): string {
    return LEGACY_BATTLE_ITEM_ALIASES[id] ?? id;
}

export function groupBattleItemsByCategory(
    items: ShopItem[]
): { category: ShopBattleItemCategory; items: ShopItem[] }[] {
    const map = new Map<ShopBattleItemCategory, ShopItem[]>();
    for (const category of BATTLE_ITEM_CATEGORY_ORDER) {
        map.set(category, []);
    }
    for (const item of items) {
        if (item.type !== "battle_item") continue;
        const category = item.battleCategory ?? "held";
        map.get(category)?.push(item);
    }
    for (const category of BATTLE_ITEM_CATEGORY_ORDER) {
        map.get(category)?.sort((a, b) => {
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
    })).filter((group) => group.items.length > 0);
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
    const names: Record<string, { th: string; en: string }> = {
        held_guard_core: { th: "แกนพิทักษ์", en: "Guard Core" },
        held_swift_anklet: { th: "กำไลวายุ", en: "Swift Anklet" },
        held_scope_prism: { th: "ปริซึมจู่โจม", en: "Scope Prism" },
        held_echo_battery: { th: "แบตสะท้อนพลัง", en: "Echo Battery" },
        held_clear_mind_charm: { th: "เครื่องรางจิตใส", en: "Clear Mind Charm" },
        use_vital_vial: { th: "ขวดยาฟื้นชีพ", en: "Vital Vial" },
        use_charge_capsule: { th: "แคปซูลชาร์จพลัง", en: "Charge Capsule" },
        reward_lucky_coin: { th: "เหรียญโชคดี", en: "Lucky Coin" },
        reward_scholar_seal: { th: "ตรานักปราชญ์", en: "Scholar Seal" },
        reward_trait_crystal: { th: "ผลึกพรสวรรค์", en: "Trait Crystal" },
    };
    if (names[id]) return locale === "th" ? names[id].th : names[id].en;

    const match = /^frame_(fire|water|earth|wind|thunder|light|dark)_t([1-4])$/.exec(id);
    if (!match) return id;
    const element = match[1] as FrameElement;
    const palette = FRAME_ELEMENT_PALETTES[element];
    return locale === "th" ? `กรอบ${palette.thName}` : `${palette.enName} Frame`;
}

export function getFallbackShopItemDesc(id: string, locale: "th" | "en"): string {
    const descriptions: Record<string, { th: string; en: string }> = {
        held_guard_core: {
            th: "ลดความเสียหายที่ได้รับเล็กน้อยตลอดการต่อสู้",
            en: "Slightly reduces incoming damage throughout the battle.",
        },
        held_swift_anklet: {
            th: "เพิ่มความเร็วตั้งแต่เริ่มการต่อสู้",
            en: "Boosts speed at the start of battle.",
        },
        held_scope_prism: {
            th: "เพิ่มโอกาสคริติคอลของท่าโจมตี",
            en: "Raises the critical-hit chance of damaging moves.",
        },
        held_echo_battery: {
            th: "ฟื้นพลังงานเพิ่มตอนจบเทิร์น",
            en: "Restores extra energy at the end of each turn.",
        },
        held_clear_mind_charm: {
            th: "ป้องกันพิษ ไหม้ และหลับในการต่อสู้",
            en: "Guards against poison, burn, and sleep in battle.",
        },
        use_vital_vial: {
            th: "ฟื้น HP 25% เมื่อใช้ในการต่อสู้",
            en: "Restore 25% HP when used in battle.",
        },
        use_charge_capsule: {
            th: "ฟื้นพลังงาน +18 เมื่อใช้ในการต่อสู้",
            en: "Restore +18 energy when used in battle.",
        },
        reward_lucky_coin: {
            th: "โบนัสทอง +15 ถ้าชนะ",
            en: "+15 bonus gold if you win.",
        },
        reward_scholar_seal: {
            th: "EXP หลังชนะ x1.2",
            en: "×1.2 EXP reward if you win.",
        },
        reward_trait_crystal: {
            th: "ทรัพยากรสำหรับระบบ trait ในอนาคต",
            en: "Progression material for future trait systems.",
        },
    };
    if (descriptions[id]) return locale === "th" ? descriptions[id].th : descriptions[id].en;

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
    const normalized = resolveLegacyBattleItemId(id);
    return [...SHOP_ITEMS, ...BATTLE_ITEMS].find((item) => item.id === normalized);
}

export function getBattleItemById(id: string): ShopItem | undefined {
    const normalized = resolveLegacyBattleItemId(id);
    return BATTLE_ITEMS.find((item) => item.id === normalized);
}

export function getFrameGoldRateMultiplierById(frameId: string | null | undefined): number {
    if (!frameId) return 1;
    const frame = SHOP_ITEMS.find((item) => item.type === "frame" && item.id === frameId);
    if (!frame) return 1;
    return FRAME_GOLD_RATE_MULTIPLIER_BY_RARITY[frame.rarity] ?? 1;
}

export const ALL_ITEMS: ShopItem[] = [...SHOP_ITEMS, ...BATTLE_ITEMS];
