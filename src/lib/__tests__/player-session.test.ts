import { beforeEach, describe, expect, it } from "vitest";
import {
  clearPlayerReconnectToken,
  clearPlayerSession,
  getPlayerReconnectToken,
  getPlayerSession,
  savePlayerSession,
} from "../player-session";

const createSessionStorageMock = () => {
  const store = new Map<string, string>();
  return {
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

describe("player-session helpers", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      value: globalThis,
      configurable: true,
    });
    Object.defineProperty(globalThis, "sessionStorage", {
      value: createSessionStorageMock(),
      configurable: true,
    });
    sessionStorage.clear();
  });

  it("saves and reads the active player session with reconnect token", () => {
    savePlayerSession({
      pin: "123456",
      name: "Alice",
      reconnectToken: "token-1",
    });

    expect(getPlayerSession()).toEqual({
      pin: "123456",
      name: "Alice",
      reconnectToken: "token-1",
    });
    expect(getPlayerReconnectToken("123456", "Alice")).toBe("token-1");
  });

  it("clears both the active session and its reconnect token", () => {
    savePlayerSession({
      pin: "123456",
      name: "Alice",
      reconnectToken: "token-1",
    });

    clearPlayerSession();

    expect(getPlayerSession()).toBeNull();
    expect(getPlayerReconnectToken("123456", "Alice")).toBeNull();
  });

  it("can clear a reconnect token independently", () => {
    savePlayerSession({
      pin: "123456",
      name: "Alice",
      reconnectToken: "token-1",
    });

    clearPlayerReconnectToken("123456", "Alice");

    expect(getPlayerReconnectToken("123456", "Alice")).toBeNull();
    expect(getPlayerSession()).toEqual({
      pin: "123456",
      name: "Alice",
      reconnectToken: undefined,
    });
  });
});
