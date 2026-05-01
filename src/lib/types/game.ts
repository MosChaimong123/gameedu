export type GameStatus = "LOBBY" | "PLAYING" | "ENDED";

export type BasePlayer = {
    id: string; // Socket ID
    name: string;
    /** Verified Student.id when the player joins from a classroom/student identity flow. */
    studentId?: string;
    /** Student login code used only as a verified join credential; never required for display. */
    studentCode?: string;
    avatar?: string;
    isConnected: boolean;
    score: number; // Common score field
    correctAnswers: number;
    incorrectAnswers: number;
    responses?: Record<string, boolean>; // questionId -> isCorrect
};

export type GameSession = {
    pin: string;
    hostId: string;
    setId: string;
    status: GameStatus;
    players: BasePlayer[];
    settings: GameSettings;
    startTime?: number;
    endTime?: number;
    questions?: GameQuestion[]; // Array of Question objects
};

export type GameQuestion = {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    timeLimit?: number;
    image?: string | null;
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

/** Negamon Battle — HP แบบเรียลไทม์ (โหมดห้องสด) */
export interface NegamonBattlePlayer extends BasePlayer {
    battleHp: number;
    maxHp: number;
    eliminated: boolean;
    /** timestamp (ms) เมื่อถูก KO — ใช้ tiebreak ranking ผู้แพ้ (แพ้หลัง = อันดับดีกว่า) */
    eliminatedAt?: number;
}

/** ค่าสมดุล Negamon Battle — รวมใน GameSettings เมื่อสร้างห้องโหมดนี้ */
export type NegamonBattleTuning = {
    startHp: number;
    /** วินาทีต่อรอบคำถาม */
    roundSeconds: number;
    /** วินาทีพักหลังสรุปดาเมจ */
    betweenSeconds: number;
    /** ตอบภายในกี่วินาทีนับจากเริ่มรอบ = โจมตีเร็ว (ตัวคูณใน calcDamage) */
    fastAnswerSeconds: number;
    movePower: number;
    attackerAtk: number;
    defenderDef: number;
};

export const DEFAULT_NEGAMON_BATTLE_TUNING: NegamonBattleTuning = {
    startHp: 100,
    roundSeconds: 22,
    betweenSeconds: 4,
    fastAnswerSeconds: 4,
    movePower: 40,
    attackerAtk: 52,
    defenderDef: 36,
};

/** หนึ่งการโจมตีในรอบ Negamon Battle — ส่งพร้อม `negamon-round-result` (socket) */
export type NegamonRoundHit = {
    attackerName: string;
    targetName: string;
    damage: number;
    targetHpAfter: number;
    eliminated: boolean;
    /** ตอบถูกภายใน fastAnswerSeconds ของรอบนี้ */
    fastStrike: boolean;
};

/** Payload ของ event `negamon-round-result` */
export type NegamonRoundResultPayload = {
    logs: string[];
    hits: NegamonRoundHit[];
    players: NegamonBattlePlayer[];
};

export type GameSettings = {
    winCondition: "TIME" | "GOLD";
    timeLimitMinutes: number;
    goldGoal: number;
    allowLateJoin: boolean;
    showInstructions: boolean;
    useRandomNames: boolean;
    allowStudentAccounts: boolean;
    negamonBattle?: Partial<NegamonBattleTuning>;
    /**
     * ตั้งโดยเซิร์ฟเวอร์เท่านั้น — เมื่อจบ Negamon Battle จะให้ EXP กับนักเรียนที่จับคู่ชื่อในเกมกับ name/nickname ในห้อง
     */
    negamonRewardClassroomId?: string;
    /** จำกัดจำนวนผู้เล่นในล็อบบี้ตามแผนของโฮสต์ (ตั้งตอน create-game) */
    planMaxLivePlayers?: number;
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

// Union Type for all possible game sessions (live classroom games)
export type GameState = GoldQuestSession | CryptoHackSession;

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
    "choose-password": Record<string, never>; // Trigger password selection screen
    "hack-result": { success: boolean; reward?: number };
    "player-hacked": { hacker: string; amount: number }; // Victim notification
};
