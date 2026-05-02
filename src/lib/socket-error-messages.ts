import { AUTH_REQUIRED_MESSAGE } from "@/lib/api-error";

export const SOCKET_ERROR_INVALID_QUESTION_SET = "playSocketInvalidQuestionSet";
export const SOCKET_ERROR_UNAUTHORIZED = "playSocketUnauthorized";
export const SOCKET_ERROR_UNAUTHORIZED_QUESTION_SET = "playSocketUnauthorizedQuestionSetAccess";
export const SOCKET_ERROR_SET_NOT_FOUND = "playSocketSetNotFound";
export const SOCKET_ERROR_FAILED_TO_LOAD_QUESTIONS = "playSocketFailedToLoadQuestions";
export const SOCKET_ERROR_GAME_NOT_FOUND = "playSocketGameNotFound";
export const SOCKET_ERROR_HOST_RECONNECTION_DENIED = "playSocketHostReconnectionDenied";
export const SOCKET_ERROR_GAME_LOCKED = "playSocketGameLocked";
export const SOCKET_ERROR_INVALID_STUDENT_CODE = "playSocketInvalidStudentCode";
export const SOCKET_ERROR_NEGAMON_MID_MATCH = "playNegamonSocketMidMatch";
export const SOCKET_ERROR_NICKNAME_IN_USE = "playSocketNicknameInUse";
export const SOCKET_ERROR_LOBBY_FULL = "apiError_PLAN_LIMIT_LIVE_PLAYERS";
export const SOCKET_ERROR_ONLY_HOST_CAN_START = "playSocketOnlyHostCanStart";
export const SOCKET_ERROR_ONLY_HOST_CAN_END = "playSocketOnlyHostCanEnd";
export const SOCKET_ERROR_INVALID_GAME_CODE = "playNegamonSocketInvalidGameCode";
export const SOCKET_ERROR_TOO_MANY_SUBMISSIONS = "playNegamonSocketTooManySubmissions";
export const SOCKET_ERROR_UNAUTHORIZED_CLASSROOM_ACCESS = "playSocketUnauthorizedClassroomAccess";
export const SOCKET_ERROR_INVALID_CLASSROOM_EVENT = "playSocketInvalidClassroomEvent";
export const SOCKET_ERROR_JOIN_CLASSROOM_FIRST = "playSocketJoinClassroomFirst";
export const SOCKET_ERROR_UNAUTHORIZED_CLASSROOM_EVENT = "playSocketUnauthorizedClassroomEvent";
export const SOCKET_ERROR_CRYPTO_PASSWORD_TAKEN = "playCryptoPasswordTaken";
export const SOCKET_ERROR_CRYPTO_SELECTION_INVALID = "playCryptoSelectionInvalid";
export const SOCKET_ERROR_CRYPTO_SELECTION_SERVER = "playCryptoSelectionServerError";
export const SOCKET_ERROR_CRYPTO_SYSTEM_GLITCHED = "playCryptoSystemGlitched";

const LEGACY_SOCKET_ERROR_KEYS: Record<string, string> = {
  "Invalid question set": SOCKET_ERROR_INVALID_QUESTION_SET,
  [AUTH_REQUIRED_MESSAGE]: SOCKET_ERROR_UNAUTHORIZED,
  "Unauthorized question set access": SOCKET_ERROR_UNAUTHORIZED_QUESTION_SET,
  "Set not found": SOCKET_ERROR_SET_NOT_FOUND,
  "Failed to load questions": SOCKET_ERROR_FAILED_TO_LOAD_QUESTIONS,
  "Game not found": SOCKET_ERROR_GAME_NOT_FOUND,
  "Host reconnection denied": SOCKET_ERROR_HOST_RECONNECTION_DENIED,
  "Game is locked": SOCKET_ERROR_GAME_LOCKED,
  "Invalid student code": SOCKET_ERROR_INVALID_STUDENT_CODE,
  "Negamon Battle already started — new players cannot join mid-match": SOCKET_ERROR_NEGAMON_MID_MATCH,
  "Nickname already in use": SOCKET_ERROR_NICKNAME_IN_USE,
  "Lobby is full (plan player limit)": SOCKET_ERROR_LOBBY_FULL,
  "Only the host can start the game": SOCKET_ERROR_ONLY_HOST_CAN_START,
  "Only the host can end the game": SOCKET_ERROR_ONLY_HOST_CAN_END,
  "Invalid game code": SOCKET_ERROR_INVALID_GAME_CODE,
  "Too many submissions. Slow down.": SOCKET_ERROR_TOO_MANY_SUBMISSIONS,
  "Unauthorized classroom access": SOCKET_ERROR_UNAUTHORIZED_CLASSROOM_ACCESS,
  "Invalid classroom event": SOCKET_ERROR_INVALID_CLASSROOM_EVENT,
  "Join the classroom before sending updates": SOCKET_ERROR_JOIN_CLASSROOM_FIRST,
  "Unauthorized classroom event": SOCKET_ERROR_UNAUTHORIZED_CLASSROOM_EVENT,
  "Protocol Occupied! Choose another.": SOCKET_ERROR_CRYPTO_PASSWORD_TAKEN,
  "No rewards pending or invalid selection.": SOCKET_ERROR_CRYPTO_SELECTION_INVALID,
  "Server error processing selection.": SOCKET_ERROR_CRYPTO_SELECTION_SERVER,
  "System Glitched! Complete task to restore.": SOCKET_ERROR_CRYPTO_SYSTEM_GLITCHED,
};

function resolveSocketErrorTranslationKey(raw: string): string {
  if (
    raw.startsWith("playSocket") ||
    raw.startsWith("playNegamonSocket") ||
    raw.startsWith("playCrypto") ||
    raw.startsWith("apiError_")
  ) {
    return raw;
  }
  return LEGACY_SOCKET_ERROR_KEYS[raw] ?? raw;
}

export function formatSocketErrorMessage(
  raw: string,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const key = resolveSocketErrorTranslationKey(raw);
  const msg = t(key);
  return msg !== key ? msg : raw;
}

export function isSocketSessionResetError(raw: string): boolean {
  const key = resolveSocketErrorTranslationKey(raw);
  return (
    key === SOCKET_ERROR_GAME_NOT_FOUND ||
    key === SOCKET_ERROR_GAME_LOCKED ||
    key === SOCKET_ERROR_HOST_RECONNECTION_DENIED
  );
}
