import type { BingoPlayer, CryptoHackPlayer, GoldQuestPlayer, NegamonBattlePlayer, GameSettings } from "@/lib/types/game"
import { DEFAULT_NEGAMON_BATTLE_TUNING } from "@/lib/types/game"

export { formatSocketErrorMessage } from "@/lib/socket-error-messages"

export type GameView =
    | "LOBBY"
    | "QUESTION"
    | "FEEDBACK"
    | "CHEST"
    | "GAME_OVER"
    | "PASSWORD_SELECTION"
    | "ACTION_CHOICE"
    | "HACK_TARGET"
    | "HACK_GUESS"
    | "BOX_SELECTION"
    | "NEGAMON_BETWEEN"
    | "BINGO_CARD"

export type QuestionPayload = {
    id: string
    question: string
    options: string[]
    timeLimit: number
    image?: string
}

export type PlayerMode = "GOLD_QUEST" | "CRYPTO_HACK" | "NEGAMON_BATTLE" | "BINGO"
export type PlayerState = GoldQuestPlayer | CryptoHackPlayer | NegamonBattlePlayer | BingoPlayer

export type BingoQuestionPayload = {
    id: string
    question: string
    image?: string | null
    index: number
    total: number
}

/** สถานะฝั่งนักเรียนของโหมด Bingo (การ์ด + โจทย์ปัจจุบัน + ผลแตะล่าสุด) */
export type BingoClientState = {
    size: number
    card: string[]
    marked: boolean[]
    completedLines: number
    question: BingoQuestionPayload | null
    /** ผลแตะล่าสุด — ใช้แสดงเอฟเฟกต์ถูก/ผิด */
    lastMark: { cellIndex: number; correct: boolean; newBingo: boolean } | null
}

export type GameStartedPayload = {
    startTime: number
    settings: GameSettings
    gameMode?: PlayerMode
    timeLimit?: number
}

export type GameStateUpdatePayload = {
    players: PlayerState[]
    hackState?: "PASSWORD_SELECTION" | "HACKING" | "ENDED"
    passwordOptions?: string[]
    gameMode?: PlayerMode
}

export type JoinedSuccessPayload = {
    pin: string
    nickname: string
    reconnectToken?: string
    gameMode?: PlayerMode
    studentId?: string
    studentCode?: string
}

export function createInitialPlayer(name: string): GoldQuestPlayer {
    return {
        id: "me",
        name,
        gold: 0,
        multiplier: 1,
        streak: 0,
        isConnected: true,
        score: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        pendingChest: false,
    }
}

export function isCryptoHackPlayer(player: PlayerState): player is CryptoHackPlayer {
    return "crypto" in player
}

export function isNegamonBattlePlayer(player: PlayerState): player is NegamonBattlePlayer {
    return "battleHp" in player && typeof (player as NegamonBattlePlayer).battleHp === "number"
}

export function isBingoPlayer(player: PlayerState): player is BingoPlayer {
    return "card" in player && Array.isArray((player as BingoPlayer).card)
}

export function createBingoPlayer(name: string): BingoPlayer {
    return {
        id: "me",
        name,
        isConnected: true,
        score: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        card: [],
        marked: [],
        completedLines: 0,
        answeredCurrentIndex: -1,
        answeredQuestionId: null,
    }
}

export function createNegamonPlayer(
    name: string,
    startHp: number = DEFAULT_NEGAMON_BATTLE_TUNING.startHp
): NegamonBattlePlayer {
    return {
        id: "me",
        name,
        battleHp: startHp,
        maxHp: startHp,
        eliminated: false,
        isConnected: true,
        score: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
    }
}

export function toGoldQuestPlayer(player: PlayerState): GoldQuestPlayer {
    if (isNegamonBattlePlayer(player)) {
        return {
            id: player.id,
            name: player.name,
            avatar: player.avatar,
            isConnected: player.isConnected,
            score: player.score,
            correctAnswers: player.correctAnswers,
            incorrectAnswers: player.incorrectAnswers,
            responses: player.responses,
            gold: player.battleHp,
            multiplier: 1,
            streak: 0,
        }
    }
    if (isCryptoHackPlayer(player)) {
        return {
            gold: player.crypto,
            id: player.id,
            name: player.name,
            avatar: player.avatar,
            isConnected: player.isConnected,
            score: player.score,
            correctAnswers: player.correctAnswers,
            incorrectAnswers: player.incorrectAnswers,
            responses: player.responses,
            multiplier: 1,
            streak: 0,
        }
    }
    if (isBingoPlayer(player)) {
        return {
            gold: player.completedLines,
            id: player.id,
            name: player.name,
            avatar: player.avatar,
            isConnected: player.isConnected,
            score: player.score,
            correctAnswers: player.correctAnswers,
            incorrectAnswers: player.incorrectAnswers,
            responses: player.responses,
            multiplier: 1,
            streak: 0,
        }
    }

    return player
}

export function getPlayerScoreValue(player: PlayerState, mode: PlayerMode): number {
    if (mode === "NEGAMON_BATTLE" && isNegamonBattlePlayer(player)) return player.battleHp
    if (mode === "BINGO" && isBingoPlayer(player)) return player.completedLines
    return mode === "CRYPTO_HACK" && isCryptoHackPlayer(player) ? player.crypto : toGoldQuestPlayer(player).gold
}

export function sortPlayersForStandings(players: PlayerState[], mode: PlayerMode): PlayerState[] {
    return [...players].sort((a, b) => {
        const scoreDiff = getPlayerScoreValue(b, mode) - getPlayerScoreValue(a, mode)
        if (scoreDiff !== 0) return scoreDiff
        return a.name.localeCompare(b.name)
    })
}

export function getPlayerLiveRank(players: PlayerState[], player: PlayerState, mode: PlayerMode): number {
    const myScore = getPlayerScoreValue(player, mode)
    return players.filter((entry) => getPlayerScoreValue(entry, mode) > myScore).length + 1
}

export function findCurrentPlayer(
    players: PlayerState[],
    socketId: string | undefined,
    fallbackName: string
): PlayerState | undefined {
    return players.find((p) => socketId && p.id === socketId) ?? players.find((p) => p.name === fallbackName)
}

/** เฟส C: กัน socket event ของ Gold/Crypto ไปรบกวน UI ขณะเล่น Negamon Battle */
export function looksLikeNegamonPlayerRow(p: PlayerState): boolean {
    return "battleHp" in p && typeof (p as NegamonBattlePlayer).battleHp === "number"
}
