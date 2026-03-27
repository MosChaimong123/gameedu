import type { BattleRuntimeEventPayload } from "@/lib/game/battle-events";
export type GameStatus = "LOBBY" | "PLAYING" | "ENDED";

export type BasePlayer = {
    id: string; // Socket ID
    name: string;
    avatar?: string;
    isConnected: boolean;
    score: number; // Common score field
    correctAnswers: number;
    incorrectAnswers: number;
    responses?: Record<number, boolean>; // questionIndex -> isCorrect
};

export type GameSession = {
    pin: string;
    hostId: string;
    setId: string;
    status: GameStatus;
    players: BasePlayer[];
    settings: any;
    startTime?: number;
    endTime?: number;
    questions?: any[]; // Array of Question objects
};

// --- Gold Quest Specific Types ---

export type ChestRewardType = "GOLD" | "MULTIPLIER" | "SWAP" | "STEAL" | "LOSE_GOLD" | "NOTHING";

export type ChestReward = {
    type: ChestRewardType;
    value: number; // e.g., 50 (gold), 2 (multiplier), 25 (percent steal)
    label: string; // e.g., "+50 Gold", "Double Gold", "Steal 25%"
};

export interface GoldQuestPlayer extends BasePlayer {
    gold: number;
    multiplier: number; // Current multiplier (usually 1)
    streak: number; // For feedback/visuals
}


export type GameSettings = {
    winCondition: "TIME" | "GOLD";
    timeLimitMinutes: number;
    goldGoal: number;
    allowLateJoin: boolean;
    showInstructions: boolean;
    useRandomNames: boolean;
    allowStudentAccounts: boolean;
};

export interface GoldQuestSession extends GameSession {
    mode: "GOLD_QUEST";
    players: GoldQuestPlayer[];
    settings: GameSettings;
    // Game State
    endTime?: number; // Timestamp when game ends
}

export type CryptoReward =
    | { type: "CRYPTO"; amount: number }
    | { type: "MULTIPLIER"; value: number }
    | { type: "HACK" }
    | { type: "NOTHING" };

// --- Crypto Hack Specific Types ---

export type HackTask =
    | {
        type: "TYPE_CODE";
        payload: {
            code: string;
        };
    }
    | { type: "UPLOAD_DATA"; payload: { size: number } }
    | { type: "PATTERN"; payload: { length: number } }
    | { type: "FREQUENCY" }
    | { type: "MEMORY" };

export interface CryptoHackPlayer extends BasePlayer {
    crypto: number;
    password: string; // Selected password
    hackChance: number; // Multiplier or chance to get hack
    isLocked: boolean; // Deprecated in favor of isGlitched? Or keeps as generic lock.
    isGlitched: boolean; // Visual glitch effect + blocked interactions
    currentTask?: HackTask | null; // The task they must complete to unlock
    pendingRewards?: CryptoReward[]; // Store rewards here for persistence
    hackingHistory: Record<string, number>; // targetId -> failedAttempts
    completedTaskTypes: string[]; // Track completed tasks to avoid repeats
}

export interface CryptoHackSession extends GameSession {
    mode: "CRYPTO_HACK";
    players: CryptoHackPlayer[];
    settings: GameSettings; // Reuse for now
    gameState: "PASSWORD_SELECTION" | "HACKING" | "ENDED"; // Sub-states
}

// --- Battle Turn Specific Types ---

// Re-export the canonical Skill definition from job-system to eliminate the duplicate interface.
// The previous definition here had incompatible fields (apCost, animationId) that did not match
// the actual runtime data produced by buildGlobalSkillMap().
export type { Skill } from "@/lib/game/job-system";

export interface BattleMonster {
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    image: string;
    skills: string[]; // Logic for AI?
}

export interface MaterialDrop {
    type: string;
    quantity: number;
}

export interface SoloMonster {
    name: string;
    hp: number;
    maxHp: number;
    atk: number;
    wave: number;
    statusEffects: StatusEffect[];
}

// ─── Status Effects ───────────────────────────────────────────────────────────

export type StatusEffectType =
    | "SLOW"         // target: 35% chance to skip attack
    | "STUN"         // target: skip next 1 attack unconditionally
    | "ARMOR_PIERCE" // target: take +20% more damage for N turns
    | "POISON"       // target: take `value` damage per action for 3-4 turns
    | "REGEN"        // player: heal `value` HP per action for 4 turns
    | "CRIT_BUFF"    // player: CRIT +0.30 for 3 turns
    | "DEBUFF_ATK"   // target: ATK ×0.70 for 2 turns
    | "DEF_BREAK"    // target: take +50% more damage for 3 turns
    | "BUFF_ATK"     // player: ATK ×1.4 for 3 turns
    | "BUFF_DEF";    // player: take 50% less damage for 2 turns

export interface StatusEffect {
    type: StatusEffectType;
    turnsRemaining: number;
    value?: number;   // damage per tick (POISON), heal per tick (REGEN)
    sourceId: string;
}

export interface BossState {
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    atk: number;
    lastAttackTick: number;
    attackIntervalMs: number;
    statusEffects: StatusEffect[];
}

export interface LootPayload {
    gold: number;
    xp: number;
    itemIds: string[];
    materials: MaterialDrop[];
}

export interface FinalReward {
    studentId: string;
    playerName: string;
    earnedGold: number;
    earnedXp: number;
    itemDrops: string[];
    materialDrops: MaterialDrop[];
    leveledUp: boolean;
    newLevel: number;
    error?: boolean;
}

export type BattlePhase = "LOBBY" | "PREP" | "CO_OP_BOSS_RAID" | "SOLO_FARMING" | "RESULT";

export interface BattlePlayer extends BasePlayer {
    // HP / AP / MP
    // NOTE: `ap` / `maxAp` represent *Stamina* (physical action resource), not generic Action Points.
    // This naming predates the Stamina system. A full rename to `stamina`/`maxStamina` is
    // tracked for a future breaking-change sprint. Until then, treat ap === stamina everywhere.
    hp: number;
    maxHp: number;
    ap: number;    // stamina (physical resource consumed by AP-cost skills and farming attacks)
    maxAp: number; // maximum stamina
    stamina?: number; // compatibility alias for UI/readability
    maxStamina?: number; // compatibility alias for UI/readability
    mp: number;
    maxMp: number;
    // Combat stats (loaded from StatCalculator in PREP)
    atk: number;
    def: number;
    spd: number;
    crit: number;
    luck: number;
    mag: number;
    level: number;
    // Job class
    jobClass: string | null;
    jobTier: string;
    skills: string[];
    skillTreeProgress?: Record<string, number>;
    isDefending: boolean;
    // Solo farming
    wave: number;
    soloMonster: SoloMonster | null;
    // Session tracking
    studentId: string;
    immortalUsed: boolean;
    // Special item effect flags (loaded from equipped items in PREP)
    hasLifesteal: boolean;
    hasImmortal: boolean;
    hasManaFlow: boolean;
    hasTimeWarp: boolean;
    hasToughSkin: boolean;
    hasTitanWill: boolean;
    hasHolyFury: boolean;
    hasArcaneSurge: boolean;
    hasDarkPact: boolean;
    hasHawkEye: boolean;
    hasShadowVeil: boolean;
    hasGodBlessing: boolean;
    hasLuckyStrike: boolean;
    chainLightningOnCrit: boolean;
    // New effects
    hasBerserkerRage: boolean;
    hasBattleFocus: boolean;
    hasEchoStrike: boolean;
    hasDragonBlood: boolean;
    hasCelestialGrace: boolean;
    hasVoidWalker: boolean;
    hasSoulEater: boolean;
    dodgeChance: number;
    shadowVeilCritBuff: boolean;
    goldMultiplier: number;
    xpMultiplier: number;
    bossDamageMultiplier: number;
    statusEffects: StatusEffect[];
    earnedGold: number;
    earnedXp: number;
    itemDrops: string[];
    materialDrops: MaterialDrop[];
    pendingAction?: {
        type: "SKILL" | "DEFEND" | "ITEM";
        targetId: string;
        skillId?: string;
    };
}

export interface BattleTurnSession extends GameSession {
    mode: "BATTLE_TURN";
    players: BattlePlayer[];
    settings: GameSettings;
    currentRound: number;
    battlePhase: BattlePhase;
    boss: BossState | null;
    monsters: BattleMonster[];
}

// Union Type for all possible game sessions
export type GameState = GoldQuestSession | CryptoHackSession | BattleTurnSession;

// --- Socket Event Payloads ---

export type ClientEvents = {
    "open-chest": { chestIndex: number }; // 0, 1, 2
    "use-interaction": { targetId: string; type: "SWAP" | "STEAL" };
    // Crypto Hack
    "select-password": { password: string };
    "hack-attempt": { targetId: string; password: string };
    "select-box": { index: number }; // 0, 1, 2
    "task-complete": { success: boolean };
    "hack-options": { targetId: string; options: string[]; hint?: string };
    // Battle Turn
    "select-skill": { skillId: string; targetId: string };
    "battle-action": { type: "ATTACK" | "DEFEND" | "SKILL"; targetId: string; skillId?: string };
};

export type ServerEvents = {
    // ... existing ... 
    "choose-box": { options: ["HIDDEN", "HIDDEN", "HIDDEN"] }; // Just signal to show 3 boxes
    "box-reveal": { index: number; reward: CryptoReward; newTotal: number };
    // Hack Flow
    "hack-options": { targetId: string; options: string[]; hint?: string };
    "task-assigned": { task: HackTask }; // Server -> Client
    "chest-result": { reward: ChestReward; goldChange: number; newTotal: number };
    "player-gold-update": { playerId: string; gold: number; rank: number };
    "game-state-update": { players: BasePlayer[] }; // Generic Update
    "interaction-effect": { sourceName: string; targetName: string; type: "SWAP" | "STEAL"; amount?: number };
    // Crypto Hack
    "choose-password": {}; // Trigger password selection screen
    "hack-result": { success: boolean; reward?: number };
    "player-hacked": { hacker: string; amount: number }; // Victim notification
    // Battle Turn
    "battle-event": BattleRuntimeEventPayload;
    "turn-start": { round: number; players: BattlePlayer[]; monsters: BattleMonster[] };
    "phase-change": { phase: "ACTION_PHASE" | "BATTLE_PHASE" | "RESULT_PHASE" };
};
