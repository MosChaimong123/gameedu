import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";

const mockClassroomFindUnique = vi.fn();
const mockStudentFindFirst = vi.fn();
const mockBattleSessionCreate = vi.fn();
const mockBattleSessionUpdate = vi.fn();
const mockBattleSessionFindFirst = vi.fn();
const mockBattleSessionUpdateMany = vi.fn();
const mockBattleSessionCount = vi.fn();
const mockStudentUpdate = vi.fn();
const mockPointHistoryCreateMany = vi.fn();
const mockEconomyTransactionFindFirst = vi.fn();
const mockEconomyTransactionCreate = vi.fn();
const mockAuthorizeBattleRead = vi.fn();
const mockTransaction = vi.fn(async (fn: (tx: unknown) => unknown) =>
  fn({
    battleSession: {
      count: mockBattleSessionCount,
      findFirst: mockBattleSessionFindFirst,
      update: mockBattleSessionUpdate,
      updateMany: mockBattleSessionUpdateMany,
    },
    student: {
      update: mockStudentUpdate,
    },
    economyTransaction: {
      findFirst: mockEconomyTransactionFindFirst,
      create: mockEconomyTransactionCreate,
    },
    pointHistory: {
      createMany: mockPointHistoryCreateMany,
    },
  })
);

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findUnique: mockClassroomFindUnique,
    },
    student: {
      findFirst: mockStudentFindFirst,
      update: mockStudentUpdate,
    },
    battleSession: {
      create: mockBattleSessionCreate,
      update: mockBattleSessionUpdate,
      findFirst: mockBattleSessionFindFirst,
      updateMany: mockBattleSessionUpdateMany,
      count: mockBattleSessionCount,
    },
    economyTransaction: {
      findFirst: mockEconomyTransactionFindFirst,
      create: mockEconomyTransactionCreate,
    },
    pointHistory: {
      createMany: mockPointHistoryCreateMany,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/services/battle-read-auth", () => ({
  authorizeBattleRead: mockAuthorizeBattleRead,
}));

vi.mock("@/lib/classroom-utils", () => ({
  getNegamonSettings: vi.fn(() => ({
    enabled: true,
    allowStudentChoice: true,
    expPerPoint: 6,
    expPerAttendance: 18,
    species: DEFAULT_NEGAMON_SPECIES,
    studentMonsters: {
      "challenger-1": "pyronox",
      "defender-1": "aerolisk",
    },
  })),
  getStudentMonsterState: vi.fn((studentId: string) => ({
    speciesId: studentId === "challenger-1" ? "pyronox" : "aerolisk",
    speciesName: studentId === "challenger-1" ? "Pyronox" : "Aerolisk",
    type: studentId === "challenger-1" ? "FIRE" : "WIND",
    form: { rank: 0, name: "Common", icon: "x", color: "#fff" },
    stats: { hp: 100, atk: 40, def: 20, spd: 30 },
    unlockedMoves: [
      {
        id: studentId === "challenger-1" ? "pyronox-ember-fang" : "aerolisk-gale-cut",
        name: studentId === "challenger-1" ? "Cinder Snap" : "Gale Peck",
        type: studentId === "challenger-1" ? "FIRE" : "WIND",
        category: "PHYSICAL",
        power: studentId === "challenger-1" ? 34 : 32,
        accuracy: studentId === "challenger-1" ? 95 : 100,
        learnRank: 1,
      },
    ],
    rankIndex: 1,
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockClassroomFindUnique.mockResolvedValue({
    id: "class-1",
    gamifiedSettings: {},
    levelConfig: [],
  });
  mockStudentFindFirst
    .mockResolvedValueOnce({
      id: "challenger-1",
      name: "Challenger",
      behaviorPoints: 10,
    })
    .mockResolvedValueOnce({
      id: "defender-1",
      name: "Defender",
      behaviorPoints: 8,
    });
  mockBattleSessionCreate.mockResolvedValue({ id: "507f1f77bcf86cd799439011" });
  mockBattleSessionUpdate.mockResolvedValue({});
  mockBattleSessionUpdateMany.mockResolvedValue({ count: 1 });
  mockBattleSessionCount.mockResolvedValue(0);
  mockEconomyTransactionFindFirst.mockResolvedValue(null);
  mockEconomyTransactionCreate.mockResolvedValue({ id: "ledger-1" });
  mockPointHistoryCreateMany.mockResolvedValue({ count: 1 });
  mockStudentUpdate.mockResolvedValue({ gold: 130 });
  mockAuthorizeBattleRead.mockResolvedValue({
    ok: true,
    scope: "student",
    studentId: "challenger-1",
  });
});

describe("Negamon lite battle session routes", () => {
  it("starts a lite battle session and persists state into BattleSession.result", async () => {
    const { startNegamonLiteBattle } = await import("@/lib/game-negamon/server/lite-battle");
    const response = await startNegamonLiteBattle({
      challengerId: "challenger-1",
      defenderId: "defender-1",
      studentCode: "abc123",
      classId: "class-1",
    });

    expect(response.ok).toBe(true);
    expect(response.body).toMatchObject({
      sessionId: "507f1f77bcf86cd799439011",
      state: {
        battleId: "507f1f77bcf86cd799439011",
        phase: "choosing",
      },
      validChoices: expect.arrayContaining([
        expect.objectContaining({
          moveId: "basic-attack",
          enabled: true,
        }),
      ]),
    });
    expect(mockBattleSessionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        classId: "class-1",
        challengerId: "challenger-1",
        defenderId: "defender-1",
        interactivePending: true,
        result: expect.objectContaining({ mode: "negamon_lite", status: "active" }),
      }),
    });
    expect(mockBattleSessionUpdate).toHaveBeenCalledWith({
      where: { id: "507f1f77bcf86cd799439011" },
      data: {
        result: expect.objectContaining({
          mode: "negamon_lite",
          choiceRequestId: expect.stringContaining("507f1f77bcf86cd799439011:1:"),
        }),
      },
    });
  });

  it("starts a lite battle with owned battle items, consumes them, and exposes item effects", async () => {
    mockStudentFindFirst.mockReset();
    mockStudentFindFirst
      .mockResolvedValueOnce({
        id: "challenger-1",
        name: "Challenger",
        behaviorPoints: 10,
        inventory: ["item_iron_shield", "item_lucky_coin"],
        battleLoadout: ["item_iron_shield", "item_lucky_coin"],
      })
      .mockResolvedValueOnce({
        id: "defender-1",
        name: "Defender",
        behaviorPoints: 8,
        inventory: [],
        battleLoadout: [],
      });

    const { startNegamonLiteBattle } = await import("@/lib/game-negamon/server/lite-battle");
    const response = await startNegamonLiteBattle({
      challengerId: "challenger-1",
      defenderId: "defender-1",
      studentCode: "abc123",
      classId: "class-1",
    });

    expect(response.ok).toBe(true);
    expect(response.body).toMatchObject({
      inventoryChanges: {
        challenger: {
          consumedItemIds: ["held_guard_core"],
          grantedItemIds: [],
        },
      },
      itemEffects: {
        challenger: expect.arrayContaining([
          { kind: "damage_taken_multiplier", multiplier: 0.9 },
        ]),
      },
      state: {
        sides: {
          player: expect.objectContaining({
            battleItemIds: ["held_guard_core"],
            rewardGoldBonus: 0,
          }),
        },
      },
    });
    expect(mockBattleSessionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        challengerBattleItems: ["held_guard_core"],
        defenderBattleItems: [],
      }),
    });
    expect(mockStudentUpdate).toHaveBeenCalledWith({
      where: { id: "challenger-1" },
      data: { inventory: ["reward_lucky_coin"] },
    });
  });

  it("resolves a lite choice, finalizes reward, and uses stateVersion as an optimistic lock", async () => {
    const activeResult = {
      mode: "negamon_lite",
      status: "active",
      choiceRequestId: "session-1:1:123",
      state: {
        battleId: "session-1",
        seed: 123,
        turn: 1,
        phase: "choosing",
        sides: {
          player: {
            id: "challenger-1",
            name: "Challenger",
            speciesId: "pyronox",
            level: 5,
            types: ["FIRE", "DARK"],
            stats: { hp: 100, attack: 40, defense: 20, specialAttack: 40, specialDefense: 20, speed: 30 },
            hp: 100,
            energy: 40,
            maxEnergy: 40,
            moves: [
              {
                id: "pyronox-ember-fang",
                name: "Cinder Snap",
                type: "FIRE",
                category: "PHYSICAL",
                power: 220,
                accuracy: 95,
                pp: 8,
                maxPp: 8,
                energyCost: 8,
                target: "opponent",
              },
            ],
          },
          opponent: {
            id: "defender-1",
            name: "Defender",
            speciesId: "aerolisk",
            level: 5,
            types: ["WIND", "THUNDER"],
            stats: { hp: 40, attack: 30, defense: 20, specialAttack: 30, specialDefense: 20, speed: 20 },
            hp: 40,
            energy: 40,
            maxEnergy: 40,
            moves: [],
          },
        },
        events: [],
      },
    };

    mockStudentFindFirst.mockReset();
    mockStudentFindFirst.mockResolvedValue({ id: "challenger-1" });
    mockBattleSessionFindFirst
      .mockResolvedValueOnce({
      id: "session-1",
      classId: "class-1",
      challengerId: "challenger-1",
      defenderId: "defender-1",
      interactivePending: true,
      stateVersion: 7,
      result: activeResult,
    })
      .mockResolvedValueOnce(null);

    const { chooseNegamonLiteMove } = await import("@/lib/game-negamon/server/lite-battle");
    const response = await chooseNegamonLiteMove({
      challengerId: "challenger-1",
      defenderId: "defender-1",
      studentCode: "abc123",
      sessionId: "session-1",
      choiceRequestId: "session-1:1:123",
      moveId: "pyronox-ember-fang",
      classId: "class-1",
    });

    expect(response.ok).toBe(true);
    expect(response.body).toMatchObject({
      final: {
        winnerId: "challenger-1",
        requestedGoldReward: 30,
        goldReward: 30,
        rewardBlockedReason: null,
        rewardIdempotencyKey: "game:negamon:session-1:challenger-1:battle-finalize",
        reward: expect.objectContaining({
          gold: 30,
          exp: expect.any(Number),
        }),
        progression: expect.objectContaining({
          expDelta: expect.any(Number),
          behaviorPointDelta: expect.any(Number),
        }),
        historyEvents: expect.arrayContaining([
          expect.objectContaining({ kind: "reward_granted" }),
        ]),
      },
      state: { phase: "ended", winner: "player" },
    });
    expect(mockBattleSessionUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "session-1",
        classId: "class-1",
        challengerId: "challenger-1",
        defenderId: "defender-1",
        interactivePending: true,
        stateVersion: 7,
      },
      data: expect.objectContaining({
        winnerId: "challenger-1",
        goldReward: 30,
        interactivePending: false,
        stateVersion: { increment: 1 },
      }),
    });
    expect(mockBattleSessionUpdate).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: {
        result: expect.objectContaining({
          rewardIdempotencyKey: "game:negamon:session-1:challenger-1:battle-finalize",
          reward: expect.objectContaining({ gold: 30 }),
          progression: expect.any(Object),
          historyEvents: expect.arrayContaining([
            expect.objectContaining({ kind: "reward_granted" }),
          ]),
        }),
      },
    });
    expect(mockPointHistoryCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          studentId: "challenger-1",
          reason: "negamon_battle_reward",
        }),
      ]),
    });
    expect(mockStudentUpdate).toHaveBeenCalledWith({
      where: { id: "challenger-1" },
      data: { gold: { increment: 30 } },
      select: { gold: true },
    });
    expect(mockEconomyTransactionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: "challenger-1",
        classId: "class-1",
        type: "earn",
        source: "battle",
        amount: 30,
        balanceBefore: 100,
        balanceAfter: 130,
        sourceRefId: null,
        idempotencyKey: "battle:session-1:negamon-lite:reward",
        metadata: expect.objectContaining({
          mode: "negamon_lite",
          winnerId: "challenger-1",
          requestedGoldReward: 30,
          goldReward: 30,
        }),
      }),
    });
  });

  it("does not award duplicate gold when final choice persistence conflicts", async () => {
    mockStudentFindFirst.mockReset();
    mockStudentFindFirst.mockResolvedValue({ id: "challenger-1" });
    mockBattleSessionUpdateMany.mockResolvedValueOnce({ count: 0 });
    mockBattleSessionFindFirst
      .mockResolvedValueOnce({
      id: "session-1",
      classId: "class-1",
      challengerId: "challenger-1",
      defenderId: "defender-1",
      interactivePending: true,
      stateVersion: 7,
      result: {
        mode: "negamon_lite",
        status: "active",
        choiceRequestId: "session-1:1:123",
        state: {
          battleId: "session-1",
          seed: 123,
          turn: 1,
          phase: "choosing",
          sides: {
            player: {
              id: "challenger-1",
              name: "Challenger",
              speciesId: "pyronox",
              level: 5,
              types: ["FIRE", "DARK"],
              stats: { hp: 100, attack: 40, defense: 20, specialAttack: 40, specialDefense: 20, speed: 30 },
              hp: 100,
              energy: 40,
              maxEnergy: 40,
              moves: [
                {
                  id: "pyronox-ember-fang",
                  name: "Cinder Snap",
                  type: "FIRE",
                  category: "PHYSICAL",
                  power: 220,
                  accuracy: 95,
                  pp: 8,
                  maxPp: 8,
                  energyCost: 8,
                  target: "opponent",
                },
              ],
            },
            opponent: {
              id: "defender-1",
              name: "Defender",
              speciesId: "aerolisk",
              level: 5,
              types: ["WIND", "THUNDER"],
              stats: { hp: 40, attack: 30, defense: 20, specialAttack: 30, specialDefense: 20, speed: 20 },
              hp: 40,
              energy: 40,
              maxEnergy: 40,
              moves: [],
            },
          },
          events: [],
        },
      },
    })
      .mockResolvedValueOnce(null);

    const { chooseNegamonLiteMove } = await import("@/lib/game-negamon/server/lite-battle");
    const response = await chooseNegamonLiteMove({
      challengerId: "challenger-1",
      defenderId: "defender-1",
      studentCode: "abc123",
      sessionId: "session-1",
      choiceRequestId: "session-1:1:123",
      moveId: "pyronox-ember-fang",
      classId: "class-1",
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ error: "CHOICE_CONFLICT" });
    expect(mockStudentUpdate).not.toHaveBeenCalled();
    expect(mockEconomyTransactionCreate).not.toHaveBeenCalled();
  });

  it("returns a completed final result without duplicate reward writes on retry", async () => {
    mockStudentFindFirst.mockReset();
    mockStudentFindFirst.mockResolvedValue({ id: "challenger-1" });
    mockBattleSessionFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "session-1",
        classId: "class-1",
        challengerId: "challenger-1",
        defenderId: "defender-1",
        winnerId: "challenger-1",
        goldReward: 30,
        interactivePending: false,
        stateVersion: 8,
        result: {
          mode: "negamon_lite",
          status: "finished",
          choiceRequestId: "session-1:1:123",
          winnerId: "challenger-1",
          requestedGoldReward: 30,
          goldReward: 30,
          rewardBlockedReason: null,
          rewardIdempotencyKey: "game:negamon:session-1:challenger-1:battle-finalize",
          reward: {
            gold: 30,
            exp: 49,
            grantedItemIds: [],
            levelUps: [],
            unlockedSkillIds: [],
            idempotencyKey: "game:negamon:session-1:challenger-1:battle-finalize",
          },
          progression: {
            studentId: "challenger-1",
            expDelta: 49,
            behaviorPointDelta: 9,
            unlockedSkillIds: [],
            nextBehaviorPoints: 19,
            nextNegamonSkills: [],
            shouldPersist: true,
          },
          state: {
            battleId: "session-1",
            seed: 123,
            turn: 2,
            phase: "ended",
            winner: "player",
            sides: {
              player: {
                id: "challenger-1",
                name: "Challenger",
                speciesId: "pyronox",
                level: 5,
                types: ["FIRE", "DARK"],
                stats: { hp: 100, attack: 40, defense: 20, specialAttack: 40, specialDefense: 20, speed: 30 },
                hp: 100,
                energy: 32,
                maxEnergy: 40,
                moves: [],
              },
              opponent: {
                id: "defender-1",
                name: "Defender",
                speciesId: "aerolisk",
                level: 5,
                types: ["WIND", "THUNDER"],
                stats: { hp: 40, attack: 30, defense: 20, specialAttack: 30, specialDefense: 20, speed: 20 },
                hp: 0,
                energy: 40,
                maxEnergy: 40,
                moves: [],
              },
            },
            events: [],
          },
        },
      });

    const { chooseNegamonLiteMove } = await import("@/lib/game-negamon/server/lite-battle");
    const response = await chooseNegamonLiteMove({
      challengerId: "challenger-1",
      defenderId: "defender-1",
      studentCode: "abc123",
      sessionId: "session-1",
      choiceRequestId: "session-1:1:123",
      moveId: "pyronox-ember-fang",
      classId: "class-1",
    });

    expect(response.ok).toBe(true);
    expect(response.body).toMatchObject({
      final: {
        winnerId: "challenger-1",
        goldReward: 30,
        rewardIdempotencyKey: "game:negamon:session-1:challenger-1:battle-finalize",
        reward: { gold: 30, exp: 49 },
        progression: { expDelta: 49, behaviorPointDelta: 9 },
      },
      state: { phase: "ended", winner: "player" },
      validChoices: [],
    });
    expect(mockBattleSessionUpdateMany).not.toHaveBeenCalled();
    expect(mockBattleSessionUpdate).not.toHaveBeenCalled();
    expect(mockStudentUpdate).not.toHaveBeenCalled();
    expect(mockEconomyTransactionCreate).not.toHaveBeenCalled();
  });

  it("rejects stale lite choices before resolving or updating state", async () => {
    mockStudentFindFirst.mockReset();
    mockStudentFindFirst.mockResolvedValue({ id: "challenger-1" });
    mockBattleSessionFindFirst.mockResolvedValue({
      id: "session-1",
      classId: "class-1",
      challengerId: "challenger-1",
      defenderId: "defender-1",
      interactivePending: true,
      stateVersion: 2,
      result: {
        mode: "negamon_lite",
        status: "active",
        choiceRequestId: "session-1:2:999",
        state: {
          battleId: "session-1",
          seed: 999,
          turn: 2,
          phase: "choosing",
          sides: {
            player: {
              id: "challenger-1",
              name: "Challenger",
              speciesId: "pyronox",
              level: 5,
              types: ["FIRE", "DARK"],
              stats: { hp: 100, attack: 40, defense: 20, specialAttack: 40, specialDefense: 20, speed: 30 },
              hp: 100,
              energy: 40,
              maxEnergy: 40,
              moves: [],
            },
            opponent: {
              id: "defender-1",
              name: "Defender",
              speciesId: "aerolisk",
              level: 5,
              types: ["WIND", "THUNDER"],
              stats: { hp: 100, attack: 30, defense: 20, specialAttack: 30, specialDefense: 20, speed: 20 },
              hp: 100,
              energy: 40,
              maxEnergy: 40,
              moves: [],
            },
          },
          events: [],
        },
      },
    });

    const { chooseNegamonLiteMove } = await import("@/lib/game-negamon/server/lite-battle");
    const response = await chooseNegamonLiteMove({
      challengerId: "challenger-1",
      defenderId: "defender-1",
      studentCode: "abc123",
      sessionId: "session-1",
      choiceRequestId: "session-1:1:123",
      moveId: "pyronox-ember-fang",
      classId: "class-1",
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      error: "STALE_CHOICE",
      choiceRequestId: "session-1:2:999",
    });
    expect(mockBattleSessionUpdateMany).not.toHaveBeenCalled();
  });

  it("reads a lite battle session through the V2 session route", async () => {
    mockBattleSessionFindFirst.mockResolvedValue({
      id: "session-1",
      classId: "class-1",
      challengerId: "challenger-1",
      defenderId: "defender-1",
      winnerId: null,
      goldReward: 0,
      interactivePending: true,
      stateVersion: 3,
      createdAt: new Date("2026-05-23T00:00:00.000Z"),
      result: {
        mode: "negamon_lite",
        status: "active",
        choiceRequestId: "session-1:2:123",
        state: {
          battleId: "session-1",
          seed: 123,
          turn: 2,
          phase: "choosing",
          sides: {
            player: {
              id: "challenger-1",
              name: "Challenger",
              speciesId: "pyronox",
              level: 5,
              types: ["FIRE", "DARK"],
              stats: { hp: 100, attack: 40, defense: 20, specialAttack: 40, specialDefense: 20, speed: 30 },
              hp: 100,
              energy: 40,
              maxEnergy: 40,
              moves: [
                {
                  id: "pyronox-ember-fang",
                  name: "Cinder Snap",
                  type: "FIRE",
                  category: "PHYSICAL",
                  power: 80,
                  accuracy: 95,
                  pp: 8,
                  maxPp: 8,
                  energyCost: 8,
                  target: "opponent",
                },
              ],
            },
            opponent: {
              id: "defender-1",
              name: "Defender",
              speciesId: "aerolisk",
              level: 5,
              types: ["WIND", "THUNDER"],
              stats: { hp: 100, attack: 30, defense: 20, specialAttack: 30, specialDefense: 20, speed: 20 },
              hp: 100,
              energy: 40,
              maxEnergy: 40,
              moves: [],
            },
          },
          events: [],
        },
      },
    });

    const { GET } = await import("@/app/api/classrooms/[id]/battle/lite/session/route");
    const response = await GET(
      new Request("http://local.test/api/classrooms/class-1/battle/lite/session?sessionId=session-1&studentId=challenger-1&studentCode=abc123") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      mode: "negamon_lite",
      sessionId: "session-1",
      status: "active",
      choiceRequestId: "session-1:2:123",
      interactivePending: true,
      stateVersion: 3,
      validChoices: [
        expect.objectContaining({
          moveId: "pyronox-ember-fang",
          enabled: true,
        }),
      ],
    });
    expect(mockAuthorizeBattleRead).toHaveBeenCalledWith({
      classId: "class-1",
      studentId: "challenger-1",
      studentCode: "abc123",
    });
  });

  it("creates history summaries from finished lite session views", async () => {
    const {
      createNegamonLiteSessionHistorySummary,
      createNegamonLiteSessionView,
    } = await import("@/lib/game-negamon");
    const view = createNegamonLiteSessionView({
      id: "session-1",
      classId: "class-1",
      challengerId: "challenger-1",
      defenderId: "defender-1",
      winnerId: "challenger-1",
      goldReward: 30,
      interactivePending: false,
      stateVersion: 4,
      createdAt: new Date("2026-05-23T00:00:00.000Z"),
      result: {
        mode: "negamon_lite",
        status: "finished",
        choiceRequestId: "session-1:3:123",
        winnerId: "challenger-1",
        goldReward: 30,
        rewardBlockedReason: null,
        state: {
          battleId: "session-1",
          seed: 123,
          turn: 3,
          phase: "ended",
          winner: "player",
          sides: {
            player: {
              id: "challenger-1",
              name: "Challenger",
              speciesId: "pyronox",
              level: 5,
              types: ["FIRE", "DARK"],
              stats: { hp: 100, attack: 40, defense: 20, specialAttack: 40, specialDefense: 20, speed: 30 },
              hp: 30,
              energy: 20,
              maxEnergy: 40,
              moves: [],
            },
            opponent: {
              id: "defender-1",
              name: "Defender",
              speciesId: "aerolisk",
              level: 5,
              types: ["WIND", "THUNDER"],
              stats: { hp: 100, attack: 30, defense: 20, specialAttack: 30, specialDefense: 20, speed: 20 },
              hp: 0,
              energy: 0,
              maxEnergy: 40,
              moves: [],
            },
          },
          events: [],
        },
      },
    });

    expect(view).not.toBeNull();
    expect(createNegamonLiteSessionHistorySummary({
      view: view!,
      studentId: "challenger-1",
    })).toMatchObject({
      id: "game-history:negamon:battle_finished:challenger-1:session-1",
      outcome: "win",
      goldDelta: 30,
      opponentId: "defender-1",
    });
  });
});
