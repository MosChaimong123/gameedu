export type GameStatus = "LOBBY" | "PLAYING" | "ENDED";

export type BasePlayer = {
    id: string; // Socket ID
    name: string;
    avatar?: string;
    isConnected: boolean;
    score: number; // Common score field
    correctAnswers: number;
    incorrectAnswers: number;
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
    | { type: "PATTERN"; payload: { length: number } };
// Add more types here later

export interface CryptoHackPlayer extends BasePlayer {
    crypto: number;
    password: string; // Selected password
    hackChance: number; // Multiplier or chance to get hack
    isLocked: boolean; // Deprecated in favor of isGlitched? Or keeps as generic lock.
    isGlitched: boolean; // Visual glitch effect + blocked interactions
    currentTask?: HackTask | null; // The task they must complete to unlock
    pendingRewards?: CryptoReward[]; // Store rewards here for persistence
    hackingHistory: Record<string, number>; // targetId -> failedAttempts
}

export interface CryptoHackSession extends GameSession {
    mode: "CRYPTO_HACK";
    players: CryptoHackPlayer[];
    settings: GameSettings; // Reuse for now
    gameState: "PASSWORD_SELECTION" | "HACKING" | "ENDED"; // Sub-states
}

// Union Type for all possible game sessions
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
    "choose-password": {}; // Trigger password selection screen
    "hack-result": { success: boolean; reward?: number };
    "player-hacked": { hacker: string; amount: number }; // Victim notification
};
