import { beforeEach, describe, expect, it, vi } from "vitest";

const mockChooseNegamonBattleMoveV4 = vi.fn();

vi.mock("@/lib/game-negamon/server/battle-v4", () => ({
  chooseNegamonBattleMoveV4: mockChooseNegamonBattleMoveV4,
}));

describe("negamon V4 choice route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns stale-choice payloads unchanged so the client can resync safely", async () => {
    mockChooseNegamonBattleMoveV4.mockResolvedValue({
      ok: false,
      status: 409,
      body: {
        error: "STALE_CHOICE",
        choiceRequestId: "battle-1:v4:7:4",
        state: {
          battleId: "battle-1",
          phase: "choosing",
          turn: 4,
          stateVersion: 7,
          choices: {
            player: [{ actionId: "player:basic-attack", kind: "move", moveId: "basic-attack", label: "โจมตีธรรมดา", enabled: true }],
            opponent: [],
          },
          metadata: {
            showdown: {
              choiceDiagnostics: {
                player: {
                  side: "player",
                  requestMissing: false,
                  allChoicesUnavailable: false,
                  usedFallbackBasicChoice: false,
                  enabledChoiceCount: 1,
                  message: "state advanced after another resolved turn",
                },
              },
            },
          },
        },
        validChoices: [{ actionId: "player:basic-attack", kind: "move", moveId: "basic-attack", label: "โจมตีธรรมดา", enabled: true }],
        diagnostics: {
          side: "player",
          requestMissing: false,
          allChoicesUnavailable: false,
          usedFallbackBasicChoice: false,
          enabledChoiceCount: 1,
          message: "state advanced after another resolved turn",
        },
      },
    });

    const { POST } = await import("@/app/api/classrooms/[id]/battle/v4/choice/route");

    const response = await POST(
      new Request("http://local.test/api/classrooms/class-1/battle/v4/choice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          challengerId: " student-1 ",
          defenderId: " student-2 ",
          studentCode: " abc123 ",
          sessionId: " battle-1 ",
          choiceRequestId: " battle-1:v4:6:3 ",
          moveId: " basic-attack ",
          moveSlot: 0,
        }),
      }) as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "STALE_CHOICE",
      choiceRequestId: "battle-1:v4:7:4",
      diagnostics: {
        side: "player",
        enabledChoiceCount: 1,
        message: "state advanced after another resolved turn",
      },
      validChoices: [{ moveId: "basic-attack", enabled: true }],
      state: {
        battleId: "battle-1",
        turn: 4,
        stateVersion: 7,
      },
    });

    expect(mockChooseNegamonBattleMoveV4).toHaveBeenCalledWith({
      classId: "class-1",
      challengerId: "student-1",
      defenderId: "student-2",
      studentCode: "abc123",
      sessionId: "battle-1",
      choiceRequestId: "battle-1:v4:6:3",
      moveId: "basic-attack",
      moveSlot: 0,
      itemId: undefined,
    });
  });
});
