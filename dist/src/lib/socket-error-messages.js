"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOCKET_ERROR_GOLD_QUEST_INTERACTION_INVALID = exports.SOCKET_ERROR_GOLD_QUEST_CHEST_NOT_READY = exports.SOCKET_ERROR_GOLD_QUEST_CHEST_PENDING = exports.SOCKET_ERROR_PLAY_ROOM_PIN_MISMATCH = exports.SOCKET_ERROR_PLAY_NOT_IN_GAME = exports.SOCKET_ERROR_CRYPTO_SYSTEM_GLITCHED = exports.SOCKET_ERROR_CRYPTO_SELECTION_SERVER = exports.SOCKET_ERROR_CRYPTO_SELECTION_INVALID = exports.SOCKET_ERROR_CRYPTO_PASSWORD_TAKEN = exports.SOCKET_ERROR_UNAUTHORIZED_CLASSROOM_EVENT = exports.SOCKET_ERROR_JOIN_CLASSROOM_FIRST = exports.SOCKET_ERROR_INVALID_CLASSROOM_EVENT = exports.SOCKET_ERROR_UNAUTHORIZED_CLASSROOM_ACCESS = exports.SOCKET_ERROR_TOO_MANY_SUBMISSIONS = exports.SOCKET_ERROR_INVALID_GAME_CODE = exports.SOCKET_ERROR_ONLY_HOST_CAN_END = exports.SOCKET_ERROR_ONLY_HOST_CAN_START = exports.SOCKET_ERROR_LOBBY_FULL = exports.SOCKET_ERROR_NICKNAME_IN_USE = exports.SOCKET_ERROR_NEGAMON_MID_MATCH = exports.SOCKET_ERROR_INVALID_STUDENT_CODE = exports.SOCKET_ERROR_GAME_LOCKED = exports.SOCKET_ERROR_HOST_RECONNECTION_DENIED = exports.SOCKET_ERROR_GAME_NOT_FOUND = exports.SOCKET_ERROR_FAILED_TO_LOAD_QUESTIONS = exports.SOCKET_ERROR_SET_NOT_FOUND = exports.SOCKET_ERROR_UNAUTHORIZED_QUESTION_SET = exports.SOCKET_ERROR_UNAUTHORIZED = exports.SOCKET_ERROR_INVALID_QUESTION_SET = void 0;
exports.formatSocketErrorMessage = formatSocketErrorMessage;
exports.isSocketSessionResetError = isSocketSessionResetError;
const api_error_1 = require("@/lib/api-error");
exports.SOCKET_ERROR_INVALID_QUESTION_SET = "playSocketInvalidQuestionSet";
exports.SOCKET_ERROR_UNAUTHORIZED = "playSocketUnauthorized";
exports.SOCKET_ERROR_UNAUTHORIZED_QUESTION_SET = "playSocketUnauthorizedQuestionSetAccess";
exports.SOCKET_ERROR_SET_NOT_FOUND = "playSocketSetNotFound";
exports.SOCKET_ERROR_FAILED_TO_LOAD_QUESTIONS = "playSocketFailedToLoadQuestions";
exports.SOCKET_ERROR_GAME_NOT_FOUND = "playSocketGameNotFound";
exports.SOCKET_ERROR_HOST_RECONNECTION_DENIED = "playSocketHostReconnectionDenied";
exports.SOCKET_ERROR_GAME_LOCKED = "playSocketGameLocked";
exports.SOCKET_ERROR_INVALID_STUDENT_CODE = "playSocketInvalidStudentCode";
exports.SOCKET_ERROR_NEGAMON_MID_MATCH = "playNegamonSocketMidMatch";
exports.SOCKET_ERROR_NICKNAME_IN_USE = "playSocketNicknameInUse";
exports.SOCKET_ERROR_LOBBY_FULL = "apiError_PLAN_LIMIT_LIVE_PLAYERS";
exports.SOCKET_ERROR_ONLY_HOST_CAN_START = "playSocketOnlyHostCanStart";
exports.SOCKET_ERROR_ONLY_HOST_CAN_END = "playSocketOnlyHostCanEnd";
exports.SOCKET_ERROR_INVALID_GAME_CODE = "playNegamonSocketInvalidGameCode";
exports.SOCKET_ERROR_TOO_MANY_SUBMISSIONS = "playNegamonSocketTooManySubmissions";
exports.SOCKET_ERROR_UNAUTHORIZED_CLASSROOM_ACCESS = "playSocketUnauthorizedClassroomAccess";
exports.SOCKET_ERROR_INVALID_CLASSROOM_EVENT = "playSocketInvalidClassroomEvent";
exports.SOCKET_ERROR_JOIN_CLASSROOM_FIRST = "playSocketJoinClassroomFirst";
exports.SOCKET_ERROR_UNAUTHORIZED_CLASSROOM_EVENT = "playSocketUnauthorizedClassroomEvent";
exports.SOCKET_ERROR_CRYPTO_PASSWORD_TAKEN = "playCryptoPasswordTaken";
exports.SOCKET_ERROR_CRYPTO_SELECTION_INVALID = "playCryptoSelectionInvalid";
exports.SOCKET_ERROR_CRYPTO_SELECTION_SERVER = "playCryptoSelectionServerError";
exports.SOCKET_ERROR_CRYPTO_SYSTEM_GLITCHED = "playCryptoSystemGlitched";
/** Socket is not associated with any live game player session */
exports.SOCKET_ERROR_PLAY_NOT_IN_GAME = "playSocketNotInGameRoom";
/** Client pin does not match the game bound to this socket */
exports.SOCKET_ERROR_PLAY_ROOM_PIN_MISMATCH = "playSocketRoomPinMismatch";
/** Gold Quest: must open chest before requesting the next question */
exports.SOCKET_ERROR_GOLD_QUEST_CHEST_PENDING = "playSocketGoldQuestChestPending";
/** Gold Quest: open chest only after a correct answer */
exports.SOCKET_ERROR_GOLD_QUEST_CHEST_NOT_READY = "playSocketGoldQuestChestNotReady";
/** Gold Quest: interaction target invalid or stale */
exports.SOCKET_ERROR_GOLD_QUEST_INTERACTION_INVALID = "playSocketGoldQuestInteractionInvalid";
const LEGACY_SOCKET_ERROR_KEYS = {
    "Invalid question set": exports.SOCKET_ERROR_INVALID_QUESTION_SET,
    [api_error_1.AUTH_REQUIRED_MESSAGE]: exports.SOCKET_ERROR_UNAUTHORIZED,
    "Unauthorized question set access": exports.SOCKET_ERROR_UNAUTHORIZED_QUESTION_SET,
    "Set not found": exports.SOCKET_ERROR_SET_NOT_FOUND,
    "Failed to load questions": exports.SOCKET_ERROR_FAILED_TO_LOAD_QUESTIONS,
    "Game not found": exports.SOCKET_ERROR_GAME_NOT_FOUND,
    "Host reconnection denied": exports.SOCKET_ERROR_HOST_RECONNECTION_DENIED,
    "Game is locked": exports.SOCKET_ERROR_GAME_LOCKED,
    "Invalid student code": exports.SOCKET_ERROR_INVALID_STUDENT_CODE,
    "Negamon Battle already started — new players cannot join mid-match": exports.SOCKET_ERROR_NEGAMON_MID_MATCH,
    "Nickname already in use": exports.SOCKET_ERROR_NICKNAME_IN_USE,
    "Lobby is full (plan player limit)": exports.SOCKET_ERROR_LOBBY_FULL,
    "Only the host can start the game": exports.SOCKET_ERROR_ONLY_HOST_CAN_START,
    "Only the host can end the game": exports.SOCKET_ERROR_ONLY_HOST_CAN_END,
    "Invalid game code": exports.SOCKET_ERROR_INVALID_GAME_CODE,
    "Too many submissions. Slow down.": exports.SOCKET_ERROR_TOO_MANY_SUBMISSIONS,
    "Unauthorized classroom access": exports.SOCKET_ERROR_UNAUTHORIZED_CLASSROOM_ACCESS,
    "Invalid classroom event": exports.SOCKET_ERROR_INVALID_CLASSROOM_EVENT,
    "Join the classroom before sending updates": exports.SOCKET_ERROR_JOIN_CLASSROOM_FIRST,
    "Unauthorized classroom event": exports.SOCKET_ERROR_UNAUTHORIZED_CLASSROOM_EVENT,
    "Protocol Occupied! Choose another.": exports.SOCKET_ERROR_CRYPTO_PASSWORD_TAKEN,
    "No rewards pending or invalid selection.": exports.SOCKET_ERROR_CRYPTO_SELECTION_INVALID,
    "Server error processing selection.": exports.SOCKET_ERROR_CRYPTO_SELECTION_SERVER,
    "System Glitched! Complete task to restore.": exports.SOCKET_ERROR_CRYPTO_SYSTEM_GLITCHED,
};
function resolveSocketErrorTranslationKey(raw) {
    var _a;
    if (raw.startsWith("playSocket") ||
        raw.startsWith("playNegamonSocket") ||
        raw.startsWith("playCrypto") ||
        raw.startsWith("apiError_")) {
        return raw;
    }
    return (_a = LEGACY_SOCKET_ERROR_KEYS[raw]) !== null && _a !== void 0 ? _a : raw;
}
function formatSocketErrorMessage(raw, t) {
    const key = resolveSocketErrorTranslationKey(raw);
    const msg = t(key);
    return msg !== key ? msg : raw;
}
function isSocketSessionResetError(raw) {
    const key = resolveSocketErrorTranslationKey(raw);
    return (key === exports.SOCKET_ERROR_GAME_NOT_FOUND ||
        key === exports.SOCKET_ERROR_GAME_LOCKED ||
        key === exports.SOCKET_ERROR_HOST_RECONNECTION_DENIED);
}
