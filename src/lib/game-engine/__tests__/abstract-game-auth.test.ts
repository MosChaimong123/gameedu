import { describe, expect, it } from "vitest";
import type { Server, Socket } from "socket.io";
import { AbstractGameEngine } from "../abstract-game";

const mockIo = { to: () => ({ emit: () => undefined }) } as unknown as Server;

class TestGameEngine extends AbstractGameEngine {
  public gameMode = "TEST";

  public handleEvent(): void {
    // no-op for tests
  }
}

describe("AbstractGameEngine auth guards", () => {
  it("only authorizes the registered host socket", () => {
    const game = new TestGameEngine("123456", "host-user", "set-1", {}, [], mockIo);

    game.registerHostConnection("socket-host", "host-token");

    expect(game.isHostSocket("socket-host")).toBe(true);
    expect(game.isHostSocket("socket-other")).toBe(false);
    expect(game.reconnectHost("socket-host-2", "wrong-token")).toBe(false);
    expect(game.reconnectHost("socket-host-2", "host-token")).toBe(true);
    expect(game.isHostSocket("socket-host-2")).toBe(true);
  });

  it("requires the issued reconnect token before a player can reclaim a nickname", () => {
    const game = new TestGameEngine("123456", "host-user", "set-1", {}, [], mockIo);

    game.registerPlayerReconnectToken("Alice", "player-token");

    expect(game.canReconnectPlayer("Alice")).toBe(false);
    expect(game.canReconnectPlayer("Alice", "wrong-token")).toBe(false);
    expect(game.canReconnectPlayer("Alice", "player-token")).toBe(true);
    expect(game.getPlayerReconnectToken("Alice")).toBe("player-token");
  });

  it("drops a player's reconnect token after leaving the game", () => {
    const game = new TestGameEngine("123456", "host-user", "set-1", {}, [], mockIo);

    game.registerPlayerReconnectToken("Alice", "player-token");
    game.addPlayer(
      {
        id: "socket-1",
        name: "Alice",
        isConnected: true,
        score: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
      },
      {} as Socket
    );

    game.removePlayer("socket-1");

    expect(game.getPlayerReconnectToken("Alice")).toBeUndefined();
  });
});
