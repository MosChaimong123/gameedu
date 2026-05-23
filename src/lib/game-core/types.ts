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
    xp?: number;
    blockedReason?: GameRewardBlockedReason;
    idempotencyKey?: string;
};

export type GameInventoryChange = {
    consumedItemIds: string[];
    grantedItemIds: string[];
    equippedItemIds?: string[];
    unequippedItemIds?: string[];
};

export type GameEconomyMutationType = "earn" | "spend" | "adjust";

export type GameEconomySource =
    | "passive_gold"
    | "checkin"
    | "quest"
    | "battle"
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
    | "reward_granted";

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
    itemsGranted: number;
    byGameKind: Partial<Record<GameKind, number>>;
    byStudent: Record<string, number>;
};
