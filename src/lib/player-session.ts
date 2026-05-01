export type PlayerSession = {
  pin: string;
  name: string;
  reconnectToken?: string;
  studentId?: string;
  studentCode?: string;
};

const PLAYER_PIN_KEY = "game_pin";
const PLAYER_NAME_KEY = "player_name";
const STUDENT_ID_KEY = "student_id";
const STUDENT_CODE_KEY = "student_code";

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined";
}

export function getPlayerReconnectTokenKey(pin: string, name: string): string {
  return `player_reconnect_token_${pin}_${name}`;
}

export function getPlayerReconnectToken(pin: string, name: string): string | null {
  if (!canUseSessionStorage()) return null;
  return sessionStorage.getItem(getPlayerReconnectTokenKey(pin, name));
}

export function setPlayerReconnectToken(pin: string, name: string, reconnectToken: string): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.setItem(getPlayerReconnectTokenKey(pin, name), reconnectToken);
}

export function clearPlayerReconnectToken(pin: string, name: string): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.removeItem(getPlayerReconnectTokenKey(pin, name));
}

export function getPlayerSession(): PlayerSession | null {
  if (!canUseSessionStorage()) return null;

  const pin = sessionStorage.getItem(PLAYER_PIN_KEY);
  const name = sessionStorage.getItem(PLAYER_NAME_KEY);
  if (!pin || !name) return null;

  return {
    pin,
    name,
    reconnectToken: getPlayerReconnectToken(pin, name) ?? undefined,
    studentId: sessionStorage.getItem(STUDENT_ID_KEY) ?? undefined,
    studentCode: sessionStorage.getItem(STUDENT_CODE_KEY) ?? undefined,
  };
}

export function savePlayerSession(session: PlayerSession): void {
  if (!canUseSessionStorage()) return;

  sessionStorage.setItem(PLAYER_PIN_KEY, session.pin);
  sessionStorage.setItem(PLAYER_NAME_KEY, session.name);
  if (session.reconnectToken) {
    setPlayerReconnectToken(session.pin, session.name, session.reconnectToken);
  }
  if (session.studentId) {
    sessionStorage.setItem(STUDENT_ID_KEY, session.studentId);
  }
  if (session.studentCode) {
    sessionStorage.setItem(STUDENT_CODE_KEY, session.studentCode);
  }
}

export function clearPlayerSession(options?: { clearReconnectToken?: boolean }): void {
  if (!canUseSessionStorage()) return;

  const session = getPlayerSession();
  if (options?.clearReconnectToken !== false && session) {
    clearPlayerReconnectToken(session.pin, session.name);
  }

  sessionStorage.removeItem(PLAYER_PIN_KEY);
  sessionStorage.removeItem(PLAYER_NAME_KEY);
  sessionStorage.removeItem(STUDENT_ID_KEY);
  sessionStorage.removeItem(STUDENT_CODE_KEY);
}

export function getStoredStudentId(): string {
  if (!canUseSessionStorage()) return "";
  return sessionStorage.getItem(STUDENT_ID_KEY) ?? "";
}

export function getStoredStudentCode(): string {
  if (!canUseSessionStorage()) return "";
  return sessionStorage.getItem(STUDENT_CODE_KEY) ?? "";
}

export function saveStudentIdentity(studentId: string, studentCode: string): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.setItem(STUDENT_ID_KEY, studentId);
  sessionStorage.setItem(STUDENT_CODE_KEY, studentCode);
}
