export type GameKind = "negamon" | "gold-quest" | "crypto-hack" | "quest" | "shop";

export type GameSessionStatus = "pending" | "active" | "finished" | "cancelled";

export type GameSide = "player" | "opponent" | "team" | "system";

export type GameRewardBlockedReason =
    | "daily_cap"
    | "pair_cooldown"
    | "duplicate_finalize"
    | "not_completed"
    | "not_allowed";

export type GameSessionSummary = {
    id: string;
    kind: GameKind;
    status: GameSessionStatus;
    studentId: string;
    classId: string;
    startedAt: string;
    finishedAt?: string;
    opponentId?: string;
    winnerId?: string;
};

export type GameRewardResult = {
    gold: number;
    grantedItemIds: string[];
    exp: number;
    xp?: number;
    levelUps: GameLevelUpSummary[];
    unlockedSkillIds: string[];
    blockedReason?: GameRewardBlockedReason;
    idempotencyKey?: string;
};

export type GameLevelUpSummary = {
    fromLevel: number;
    toLevel: number;
    fromRankIndex?: number;
    toRankIndex?: number;
    expBefore: number;
    expAfter: number;
};

export type GameInventoryChange = {
    consumedItemIds: string[];
    grantedItemIds: string[];
    equippedItemIds?: string[];
    unequippedItemIds?: string[];
};

export type GameItemRarity = "common" | "rare" | "epic" | "legendary";

export type GameItemType = "consumable" | "battle" | "equipment" | "material" | "cosmetic";

export type GameItemEffect =
    | { kind: "stat_boost"; stat: "atk" | "def" | "spd"; multiplier: number }
    | { kind: "status_immunity"; status: string }
    | { kind: "gold_bonus"; amount: number }
    | { kind: "gold_multiplier"; multiplier: number }
    | { kind: "exp_multiplier"; multiplier: number }
    | { kind: "restore_hp"; percent: number }
    | { kind: "restore_energy"; amount: number }
    | { kind: "crit_bonus"; percent: number }
    | { kind: "damage_taken_multiplier"; multiplier: number }
    | { kind: "energy_regen"; amount: number }
    | { kind: "unlock_skill"; skillId: string };

export type GameItemDefinition = {
    id: string;
    nameKey?: string;
    descriptionKey?: string;
    icon?: string;
    rarity: GameItemRarity;
    itemType: GameItemType;
    priceGold?: number;
    sellGold?: number;
    stackable: boolean;
    maxStack?: number;
    allowedInBattle: boolean;
    effects: GameItemEffect[];
    requirements?: {
        level?: number;
        rankIndex?: number;
        speciesId?: string;
    };
};

export type GameEconomyMutationType = "earn" | "spend" | "adjust";

export type GameEconomySource =
    | "passive_gold"
    | "checkin"
    | "quest"
    | "battle"
    | "line_assignment"
    | "shop"
    | "admin_adjustment"
    | "migration";

export type GameEconomyMutation = {
    studentId: string;
    classId?: string | null;
    type: GameEconomyMutationType;
    source: GameEconomySource;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    sourceRefId?: string | null;
    idempotencyKey?: string;
};

export type GameQuestProgress = {
    questId: string;
    completed: boolean;
    claimed: boolean;
    progress?: number;
    target?: number;
    reward: GameRewardResult;
};

export type GameSkillCategory = "attack" | "heal" | "buff" | "debuff" | "passive";

export type GameSkillSnapshot = {
    id: string;
    name: string;
    category: GameSkillCategory;
    level: number;
    unlocked: boolean;
    energyCost?: number;
};

export type GameMonsterSnapshot = {
    studentId: string;
    speciesId: string;
    formName: string;
    rankIndex: number;
    level: number;
    types: string[];
    stats: Record<string, number>;
    skills: GameSkillSnapshot[];
};

export type GameHistoryEventKind =
    | "quest_claimed"
    | "shop_purchase"
    | "item_equipped"
    | "battle_started"
    | "battle_finished"
    | "reward_granted"
    | "level_up"
    | "skill_unlocked"
    | "evolution_unlocked";

export type GameHistoryEvent = {
    id: string;
    kind: GameHistoryEventKind;
    gameKind: GameKind;
    studentId: string;
    classId?: string;
    sessionId?: string;
    createdAt: string;
    titleKey: string;
    descriptionKey?: string;
    reward?: GameRewardResult;
    inventoryChange?: GameInventoryChange;
};

export type GameHistorySummary = {
    id: string;
    kind: GameHistoryEventKind;
    gameKind: GameKind;
    studentId: string;
    classId?: string | null;
    opponentId?: string | null;
    winnerId?: string | null;
    outcome?: "win" | "loss" | "draw";
    goldDelta: number;
    expDelta: number;
    itemDelta: number;
    createdAt: string;
    sourceRefId?: string | null;
    titleKey: string;
};

export type GameHistoryAnalytics = {
    totalEvents: number;
    wins: number;
    losses: number;
    goldEarned: number;
    goldSpent: number;
    expEarned: number;
    itemsGranted: number;
    byGameKind: Partial<Record<GameKind, number>>;
    byStudent: Record<string, number>;
};
