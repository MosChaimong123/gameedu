import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";

const mockClassroomFindUnique = vi.fn();
const mockStudentFindFirst = vi.fn();
const mockStudentUpdate = vi.fn();
const mockBattleSessionCreate = vi.fn();
const mockBattleSessionUpdate = vi.fn();
const mockBattleSessionFindFirst = vi.fn();
const mockBattleSessionUpdateMany = vi.fn();
const mockBattleSessionCount = vi.fn();
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
    engineVersion: "pokemon_v3",
    enabled: true,
    allowStudentChoice: true,
    expPerPoint: 10,
    expPerAttendance: 20,
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
    unlockedMoves: [],
    rankIndex: 1,
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockClassroomFindUnique.mockResolvedValue({
    id: "class-1",
    gamifiedSettings: {
      negamon: {
        engineVersion: "pokemon_v3",
      },
    },
    levelConfig: [],
  });
  mockBattleSessionCreate.mockResolvedValue({ id: "507f1f77bcf86cd799439099" });
  mockBattleSessionUpdate.mockResolvedValue({});
  mockBattleSessionUpdateMany.mockResolvedValue({ count: 1 });
  mockBattleSessionCount.mockResolvedValue(0);
  mockEconomyTransactionFindFirst.mockResolvedValue(null);
  mockEconomyTransactionCreate.mockResolvedValue({ id: "ledger-1" });
  mockPointHistoryCreateMany.mockResolvedValue({ count: 1 });
  mockStudentUpdate.mockResolvedValue({ gold: 130, inventory: [] });
  mockAuthorizeBattleRead.mockResolvedValue({
    ok: true,
    scope: "student",
    studentId: "challenger-1",
  });
});

describe("Negamon V3 battle session routes", () => {
  it("starts a V3 battle session even when the classroom no longer carries an explicit engineVersion flag", async () => {
    mockClassroomFindUnique.mockResolvedValueOnce({
      id: "class-1",
      gamifiedSettings: {},
      levelConfig: [],
    });
    mockStudentFindFirst
      .mockResolvedValueOnce({
        id: "challenger-1",
        name: "Challenger",
        behaviorPoints: 10,
        inventory: [],
        battleLoadout: [],
        negamonSkills: ["pyronox-ember-fang"],
      })
      .mockResolvedValueOnce({
        id: "defender-1",
        name: "Defender",
        behaviorPoints: 8,
        inventory: [],
        battleLoadout: [],
        negamonSkills: ["aerolisk-gale-cut"],
      });

    const { POST } = await import("@/app/api/classrooms/[id]/battle/lite/start/route");
    const response = await POST(
      new Request("http://local.test/api/classrooms/class-1/battle/lite/start", {
        method: "POST",
        body: JSON.stringify({
          challengerId: "challenger-1",
          defenderId: "defender-1",
          studentCode: "abc123",
        }),
      }) as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      mode: "negamon_battle",
      engineVersion: "negamon_v3_pokemon_inspired",
    });
  });

  it("starts a V3 battle session when the classroom engineVersion is pokemon_v3", async () => {
    mockStudentFindFirst
      .mockResolvedValueOnce({
        id: "challenger-1",
        name: "Challenger",
        behaviorPoints: 10,
        inventory: [],
        battleLoadout: [],
        negamonSkills: ["pyronox-ember-fang", "pyronox-war-cry"],
      })
      .mockResolvedValueOnce({
        id: "defender-1",
        name: "Defender",
        behaviorPoints: 8,
        inventory: [],
        battleLoadout: [],
        negamonSkills: ["aerolisk-gale-cut", "aerolisk-tail-rush"],
      });

    const { POST } = await import("@/app/api/classrooms/[id]/battle/lite/start/route");
    const response = await POST(
      new Request("http://local.test/api/classrooms/class-1/battle/lite/start", {
        method: "POST",
        body: JSON.stringify({
          challengerId: "challenger-1",
          defenderId: "defender-1",
          studentCode: "abc123",
        }),
      }) as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      mode: "negamon_battle",
      engineVersion: "negamon_v3_pokemon_inspired",
      sessionId: "507f1f77bcf86cd799439099",
      state: {
        battleId: "507f1f77bcf86cd799439099",
        phase: "choosing",
      },
      validChoices: [expect.objectContaining({ enabled: true })],
    });
    expect(mockBattleSessionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        classId: "class-1",
        challengerId: "challenger-1",
        defenderId: "defender-1",
        interactivePending: true,
        result: expect.objectContaining({
          mode: "negamon_battle",
          engineVersion: "negamon_v3_pokemon_inspired",
          status: "active",
        }),
      }),
    });
  });

  it("resolves a V3 choice through the migrated route path", async () => {
    const gameNegamon = await import("@/lib/game-negamon");
    const skill = {
      id: "pyronox-ember-fang",
      name: "Ember Fang",
      description: "Attack",
      elementType: "FIRE" as const,
      category: "attack" as const,
      target: "enemy" as const,
      power: 34,
      accuracy: 100,
      energyCost: 8,
      cooldownTurns: 0,
      priority: 0,
      effects: [
        { kind: "damage", power: 34 } as const,
        { kind: "energy_cost", value: 8 } as const,
      ],
      unlock: { rankIndex: 1, speciesId: "pyronox" },
      sourceMove: {
        id: "pyronox-ember-fang",
        name: "Ember Fang",
        type: "FIRE" as const,
        category: "PHYSICAL" as const,
        power: 34,
        accuracy: 100,
        learnRank: 1,
        energyCost: 8,
      },
    };

    const player = gameNegamon.createBattleCombatantV3({
      runtime: gameNegamon.createRuntimeCombatant({
        id: "challenger-1",
        side: "player",
        name: "Challenger",
        level: 5,
        types: ["FIRE", "DARK"],
        stats: {
          maxHp: 120,
          attack: 44,
          defense: 24,
          specialAttack: 44,
          specialDefense: 24,
          speed: 36,
        },
        maxEnergy: 40,
        energy: 40,
      }),
      speciesId: "pyronox",
      speciesName: "Pyronox",
      formName: "Pyronox",
      rankIndex: 3,
      moveSkills: [skill],
    });
    const opponent = gameNegamon.createBattleCombatantV3({
      runtime: gameNegamon.createRuntimeCombatant({
        id: "defender-1",
        side: "opponent",
        name: "Defender",
        level: 5,
        types: ["WIND", "THUNDER"],
        stats: {
          maxHp: 140,
          attack: 38,
          defense: 26,
          specialAttack: 38,
          specialDefense: 26,
          speed: 32,
        },
        maxEnergy: 40,
        energy: 40,
      }),
      speciesId: "aerolisk",
      speciesName: "Aerolisk",
      formName: "Aerolisk",
      rankIndex: 3,
      moveSkills: [
        {
          ...skill,
          id: "aerolisk-gale-cut",
          name: "Gale Cut",
          elementType: "WIND",
          sourceMove: {
            ...skill.sourceMove,
            id: "aerolisk-gale-cut",
            name: "Gale Cut",
            type: "WIND",
          },
        },
      ],
    });
    const state = gameNegamon.createBattleStateV3({
      battleId: "session-v3-1",
      seed: 15,
      player,
      opponent,
    });

    mockStudentFindFirst.mockResolvedValue({ id: "challenger-1" });
    mockBattleSessionFindFirst.mockResolvedValue({
      id: "session-v3-1",
      classId: "class-1",
      challengerId: "challenger-1",
      defenderId: "defender-1",
      winnerId: null,
      goldReward: 0,
      interactivePending: true,
      stateVersion: 2,
      createdAt: new Date("2026-05-24T00:00:00.000Z"),
      result: {
        mode: "negamon_battle",
        engineVersion: "negamon_v3_pokemon_inspired",
        status: "active",
        choiceRequestId: state.choiceRequestId,
        state,
      },
    });

    const { POST } = await import("@/app/api/classrooms/[id]/battle/lite/choice/route");
    const response = await POST(
      new Request("http://local.test/api/classrooms/class-1/battle/lite/choice", {
        method: "POST",
        body: JSON.stringify({
          challengerId: "challenger-1",
          defenderId: "defender-1",
          studentCode: "abc123",
          sessionId: "session-v3-1",
          choiceRequestId: state.choiceRequestId,
          moveId: "pyronox-ember-fang",
        }),
      }) as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      mode: "negamon_battle",
      engineVersion: "negamon_v3_pokemon_inspired",
      state: {
        battleId: "session-v3-1",
      },
      validChoices: [expect.objectContaining({ moveId: "pyronox-ember-fang" })],
    });
    expect(mockBattleSessionUpdateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "session-v3-1",
        interactivePending: true,
        stateVersion: 2,
      }),
      data: expect.objectContaining({
        interactivePending: true,
        stateVersion: { increment: 1 },
      }),
    });
  });

  it("renders a V3 session view from the shared session route", async () => {
    const sessionResult = {
      mode: "negamon_battle" as const,
      engineVersion: "negamon_v3_pokemon_inspired" as const,
      status: "active" as const,
      choiceRequestId: "session-v3-2:1:1",
      state: {
        battleId: "session-v3-2",
        engineVersion: "negamon_v3_pokemon_inspired" as const,
        seed: 1,
        rngCursor: 0,
        turn: 1,
        phase: "choosing" as const,
        sides: {
          player: {
            id: "challenger-1",
            side: "player" as const,
            name: "Challenger",
            speciesId: "pyronox",
            speciesName: "Pyronox",
            formName: "Pyronox",
            rankIndex: 3,
            level: 5,
            types: ["FIRE", "DARK"],
            stats: {
              maxHp: 120,
              attack: 44,
              defense: 24,
              specialAttack: 44,
              specialDefense: 24,
              speed: 36,
            },
            statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0, accuracy: 0, evasion: 0 },
            battleItemIds: [],
            hp: 120,
            energy: 40,
            maxEnergy: 40,
            statuses: [],
            volatileStates: [],
            moveSlots: [
              {
                slot: 0,
                skillId: "pyronox-ember-fang",
                label: "Ember Fang",
                targetSlot: "opponent",
                maxPp: 6,
                pp: 6,
                cooldownRemaining: 0,
                skill: {
                  id: "pyronox-ember-fang",
                  name: "Ember Fang",
                  description: "Attack",
                  elementType: "FIRE",
                  category: "attack",
                  target: "enemy",
                  power: 34,
                  accuracy: 100,
                  energyCost: 8,
                  cooldownTurns: 0,
                  priority: 0,
                  effects: [{ kind: "damage", power: 34 }, { kind: "energy_cost", value: 8 }],
                  unlock: { rankIndex: 1, speciesId: "pyronox" },
                  sourceMove: { id: "pyronox-ember-fang", name: "Ember Fang", type: "FIRE", category: "PHYSICAL", power: 34, accuracy: 100, learnRank: 1, energyCost: 8 },
                },
              },
            ],
            fainted: false,
            hookFlags: {},
            rewardGoldBonus: 0,
            rewardGoldMultiplier: 1,
            rewardExpMultiplier: 1,
            critChanceBonusPercent: 0,
            outgoingDamageMultiplier: 1,
          },
          opponent: {
            id: "defender-1",
            side: "opponent" as const,
            name: "Defender",
            speciesId: "aerolisk",
            speciesName: "Aerolisk",
            formName: "Aerolisk",
            rankIndex: 3,
            level: 5,
            types: ["WIND", "THUNDER"],
            stats: {
              maxHp: 140,
              attack: 38,
              defense: 26,
              specialAttack: 38,
              specialDefense: 26,
              speed: 32,
            },
            statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0, accuracy: 0, evasion: 0 },
            battleItemIds: [],
            hp: 140,
            energy: 40,
            maxEnergy: 40,
            statuses: [],
            volatileStates: [],
            moveSlots: [],
            fainted: false,
            hookFlags: {},
            rewardGoldBonus: 0,
            rewardGoldMultiplier: 1,
            rewardExpMultiplier: 1,
            critChanceBonusPercent: 0,
            outgoingDamageMultiplier: 1,
          },
        },
        queue: [],
        field: {
          weather: null,
          terrain: null,
          roomEffects: [],
        },
        events: [],
        choiceRequestId: "session-v3-2:1:1",
        stateVersion: 1,
      },
    };

    mockBattleSessionFindFirst.mockResolvedValue({
      id: "session-v3-2",
      classId: "class-1",
      challengerId: "challenger-1",
      defenderId: "defender-1",
      winnerId: null,
      goldReward: 0,
      interactivePending: true,
      stateVersion: 4,
      createdAt: new Date("2026-05-24T00:00:00.000Z"),
      result: sessionResult,
    });

    const { GET } = await import("@/app/api/classrooms/[id]/battle/lite/session/route");
    const response = await GET(
      new Request("http://local.test/api/classrooms/class-1/battle/lite/session?sessionId=session-v3-2&studentId=challenger-1&studentCode=abc123") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      mode: "negamon_battle",
      engineVersion: "negamon_v3_pokemon_inspired",
      sessionId: "session-v3-2",
      stateVersion: 4,
      validChoices: [expect.objectContaining({ moveId: "pyronox-ember-fang" })],
    });
  });

  it("rejects production actions against legacy lite sessions while leaving them readable", async () => {
    mockStudentFindFirst.mockResolvedValue({ id: "challenger-1" });
    mockBattleSessionFindFirst.mockResolvedValue({
      id: "legacy-lite-1",
      classId: "class-1",
      challengerId: "challenger-1",
      defenderId: "defender-1",
      winnerId: null,
      goldReward: 0,
      interactivePending: true,
      stateVersion: 2,
      createdAt: new Date("2026-05-24T00:00:00.000Z"),
      result: {
        mode: "negamon_lite",
        status: "active",
        choiceRequestId: "legacy-lite-1:1:1",
        state: {
          battleId: "legacy-lite-1",
          seed: 1,
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

    const { POST } = await import("@/app/api/classrooms/[id]/battle/lite/choice/route");
    const response = await POST(
      new Request("http://local.test/api/classrooms/class-1/battle/lite/choice", {
        method: "POST",
        body: JSON.stringify({
          challengerId: "challenger-1",
          defenderId: "defender-1",
          studentCode: "abc123",
          sessionId: "legacy-lite-1",
          choiceRequestId: "legacy-lite-1:1:1",
          moveId: "basic-attack",
        }),
      }) as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "LEGACY_SESSION_READ_ONLY",
      sessionMode: "negamon_lite",
    });
  });
});
