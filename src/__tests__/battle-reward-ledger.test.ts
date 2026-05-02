import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClassroomFindUnique = vi.fn();
const mockStudentFindFirst = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockStudentUpdate = vi.fn();
const mockBattleSessionCreate = vi.fn();
const mockBattleSessionCount = vi.fn();
const mockBattleSessionFindMany = vi.fn();
const mockBattleSessionFindFirst = vi.fn();
const mockBattleSessionUpdate = vi.fn();
const mockBattleSessionUpdateMany = vi.fn();
const mockEconomyTransactionCreate = vi.fn();
const mockRequireSessionUser = vi.fn();
const mockTransaction = vi.fn(async (fn: (tx: unknown) => unknown) =>
  fn({
    student: {
      update: mockStudentUpdate,
    },
    battleSession: {
      create: mockBattleSessionCreate,
      count: mockBattleSessionCount,
      findMany: mockBattleSessionFindMany,
      findFirst: mockBattleSessionFindFirst,
      update: mockBattleSessionUpdate,
      updateMany: mockBattleSessionUpdateMany,
    },
    economyTransaction: {
      create: mockEconomyTransactionCreate,
    },
  })
);

vi.mock("@/lib/auth-guards", () => ({
  requireSessionUser: mockRequireSessionUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findUnique: mockClassroomFindUnique,
    },
    student: {
      findFirst: mockStudentFindFirst,
      findUnique: mockStudentFindUnique,
    },
    battleSession: {
      count: mockBattleSessionCount,
      findMany: mockBattleSessionFindMany,
      findFirst: mockBattleSessionFindFirst,
      update: mockBattleSessionUpdate,
      updateMany: mockBattleSessionUpdateMany,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/classroom-utils", () => ({
  getNegamonSettings: vi.fn(() => ({
    enabled: true,
    studentMonsters: {
      "challenger-1": "naga",
      "defender-1": "garuda",
    },
  })),
  getStudentMonsterState: vi.fn((studentId: string) => ({
    studentId,
    speciesId: studentId === "challenger-1" ? "naga" : "garuda",
    speciesName: "Testmon",
    form: { icon: "x", name: "Rank 1" },
    type: "WATER",
    stats: { hp: 100, atk: 50, def: 40, spd: 30 },
    rankIndex: 1,
    unlockedMoves: [],
  })),
}));

vi.mock("@/lib/battle-engine", () => ({
  calcGoldReward: vi.fn(() => 30),
  normalizeBattleFighterTurns: (f: unknown) => f as object,
  initBattleFighter: vi.fn((monster: { studentId: string }) => ({
    studentId: monster.studentId,
    studentName: monster.studentId === "challenger-1" ? "Challenger" : "Defender",
    speciesName: "Testmon",
    formIcon: "x",
    currentHp: 100,
    maxHp: 100,
    energy: 0,
    baseStats: { hp: 100, atk: 50, def: 40, spd: 30 },
    statStages: { atk: 0, def: 0, spd: 0 },
    status: null,
    moves: [],
  })),
  makePRNG: vi.fn(() => vi.fn(() => 0.5)),
  resolveBattle: vi.fn(() => ({
    fighters: [],
    turns: [],
    winnerId: "challenger-1",
    goldReward: 30,
    totalTurns: 2,
  })),
  resolveServerOwnedInteractiveTurn: vi.fn((player: { studentId: string }, opponent: { currentHp: number; studentId: string }) => {
    opponent.currentHp = 0;
    return {
      actorSide: "player",
      events: [
        {
          kind: "damage",
          actorId: player.studentId,
          targetId: opponent.studentId,
          value: 999,
        },
        { kind: "faint", actorId: opponent.studentId },
      ],
      faintedId: opponent.studentId,
    };
  }),
}));

vi.mock("@/lib/battle-loadout", () => ({
  normalizeLoadoutInput: vi.fn((raw: unknown) => (Array.isArray(raw) ? raw : [])),
  removeBattleItemsFromInventory: vi.fn((inventory: string[], consumedIds: string[]) => {
    const out = [...inventory];
    for (const id of consumedIds) {
      const index = out.indexOf(id);
      if (index === -1) throw new Error(`MISSING_ITEM:${id}`);
      out.splice(index, 1);
    }
    return out;
  }),
  sanitizeLoadoutAgainstInventory: vi.fn((loadout: string[], inventory: string[]) => {
    const inv = [...inventory];
    const out: string[] = [];
    for (const id of loadout) {
      const index = inv.indexOf(id);
      if (index === -1) continue;
      out.push(id);
      inv.splice(index, 1);
    }
    return out;
  }),
  validateBattleLoadout: vi.fn((ids: string[]) => ({ ok: true, normalizedIds: ids })),
}));

describe("battle reward ledger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBattleSessionCount.mockResolvedValue(0);
    mockBattleSessionFindMany.mockResolvedValue([]);
    mockBattleSessionUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("records an economy transaction when auto battle awards winner gold", async () => {
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
        gold: 100,
        inventory: [],
        battleLoadout: [],
      })
      .mockResolvedValueOnce({
        id: "defender-1",
        name: "Defender",
        behaviorPoints: 8,
        gold: 50,
        inventory: [],
        battleLoadout: [],
      });
    mockBattleSessionCreate.mockResolvedValue({
      id: "507f1f77bcf86cd799439011",
      result: {
        winnerId: "challenger-1",
        requestedGoldReward: 30,
        goldReward: 30,
        rewardBlockedReason: null,
      },
    });
    mockBattleSessionCount.mockResolvedValue(0);
    mockBattleSessionFindFirst.mockResolvedValue(null);
    mockStudentUpdate.mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ gold: 130 });
    mockEconomyTransactionCreate.mockResolvedValue({ id: "ledger-1" });

    const { POST } = await import("@/app/api/classrooms/[id]/battle/route");
    const request = {
      json: vi.fn().mockResolvedValue({
        challengerId: "challenger-1",
        defenderId: "defender-1",
        studentCode: "abc123",
      }),
    } as never;

    const response = await POST(request, {
      params: Promise.resolve({ id: "class-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      sessionId: "507f1f77bcf86cd799439011",
      result: {
        winnerId: "challenger-1",
        goldReward: 30,
      },
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
        sourceRefId: "507f1f77bcf86cd799439011",
        idempotencyKey: "battle:507f1f77bcf86cd799439011:reward",
        metadata: expect.objectContaining({
          mode: "auto",
          winnerId: "challenger-1",
          challengerId: "challenger-1",
          defenderId: "defender-1",
          goldReward: 30,
          totalTurns: 2,
        }),
      }),
    });
  });

  it("consumes defender battle items after auto battle", async () => {
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
        gold: 100,
        inventory: [],
        battleLoadout: [],
      })
      .mockResolvedValueOnce({
        id: "defender-1",
        name: "Defender",
        behaviorPoints: 8,
        gold: 50,
        inventory: ["item_buckler", "item_lucky_coin", "frame_fire_t1"],
        battleLoadout: ["item_buckler", "item_lucky_coin"],
      });
    mockBattleSessionCreate.mockResolvedValue({
      id: "507f1f77bcf86cd799439012",
      result: {
        winnerId: "challenger-1",
        requestedGoldReward: 30,
        goldReward: 30,
        rewardBlockedReason: null,
      },
    });
    mockBattleSessionCount.mockResolvedValue(0);
    mockBattleSessionFindFirst.mockResolvedValue(null);
    mockStudentUpdate
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ gold: 130 });
    mockEconomyTransactionCreate.mockResolvedValue({ id: "ledger-1" });

    const { POST } = await import("@/app/api/classrooms/[id]/battle/route");
    const request = {
      json: vi.fn().mockResolvedValue({
        challengerId: "challenger-1",
        defenderId: "defender-1",
        studentCode: "abc123",
      }),
    } as never;

    const response = await POST(request, {
      params: Promise.resolve({ id: "class-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockStudentUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: "defender-1" },
      data: {
        inventory: ["frame_fire_t1"],
        battleLoadout: [],
      },
    });
    expect(mockBattleSessionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        defenderBattleItems: ["item_buckler", "item_lucky_coin"],
      }),
    });
  });

  it("rejects legacy client-reported interactive saves", async () => {
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
        gold: 100,
        inventory: [],
        battleLoadout: [],
      })
      .mockResolvedValueOnce({
        id: "defender-1",
        name: "Defender",
        behaviorPoints: 8,
        gold: 50,
        inventory: [],
        battleLoadout: [],
      });

    const { POST } = await import("@/app/api/classrooms/[id]/battle/route");
    const request = {
      json: vi.fn().mockResolvedValue({
        challengerId: "challenger-1",
        defenderId: "defender-1",
        studentCode: "abc123",
        mode: "saveInteractive",
        sessionId: "507f1f77bcf86cd799439011",
        winnerId: "challenger-1",
        goldReward: 9999,
      }),
    } as never;

    const response = await POST(request, {
      params: Promise.resolve({ id: "class-1" }),
    });

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: "SERVER_AUTHORITATIVE_REQUIRED",
    });
    expect(mockEconomyTransactionCreate).not.toHaveBeenCalled();
  });

  it("rate limits rapid auto battle starts before mutating economy state", async () => {
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
        gold: 100,
        inventory: [],
        battleLoadout: [],
      })
      .mockResolvedValueOnce({
        id: "defender-1",
        name: "Defender",
        behaviorPoints: 8,
        gold: 50,
        inventory: [],
        battleLoadout: [],
      });
    mockBattleSessionCount.mockResolvedValueOnce(8);

    const { POST } = await import("@/app/api/classrooms/[id]/battle/route");
    const response = await POST(
      {
        json: vi.fn().mockResolvedValue({
          challengerId: "challenger-1",
          defenderId: "defender-1",
          studentCode: "abc123",
        }),
      } as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      error: "BATTLE_RATE_LIMITED",
      retryAfterSeconds: 60,
    });
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockStudentUpdate).not.toHaveBeenCalled();
    expect(mockEconomyTransactionCreate).not.toHaveBeenCalled();
  });

  it("limits abandoned interactive battle sessions per challenger", async () => {
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
        gold: 100,
        inventory: [],
        battleLoadout: [],
      })
      .mockResolvedValueOnce({
        id: "defender-1",
        name: "Defender",
        behaviorPoints: 8,
        gold: 50,
        inventory: [],
        battleLoadout: [],
      });
    mockBattleSessionCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(3);

    const { POST } = await import("@/app/api/classrooms/[id]/battle/route");
    const response = await POST(
      {
        json: vi.fn().mockResolvedValue({
          challengerId: "challenger-1",
          defenderId: "defender-1",
          studentCode: "abc123",
          mode: "beginInteractive",
          challengerLoadout: [],
        }),
      } as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "INTERACTIVE_SESSION_LIMIT",
      maxPendingSessions: 3,
    });
    expect(mockBattleSessionCreate).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("finalizes server-authoritative interactive turns with reward ledger", async () => {
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
        gold: 100,
        inventory: [],
        battleLoadout: [],
      })
      .mockResolvedValueOnce({
        id: "defender-1",
        name: "Defender",
        behaviorPoints: 8,
        gold: 50,
        inventory: [],
        battleLoadout: [],
      });
    mockBattleSessionFindFirst
      .mockResolvedValueOnce({
        id: "507f1f77bcf86cd799439011",
        classId: "class-1",
        challengerId: "challenger-1",
        defenderId: "defender-1",
        interactivePending: true,
        challengerBattleItems: [],
        defenderBattleItems: [],
        createdAt: new Date(),
        result: {
          mode: "interactive_server",
          seed: 123,
          rngCursor: 0,
          player: {
            studentId: "challenger-1",
            studentName: "Challenger",
            speciesName: "Testmon",
            formIcon: "x",
            currentHp: 100,
            maxHp: 100,
            energy: 0,
            baseStats: { hp: 100, atk: 50, def: 40, spd: 30 },
            statStages: { atk: 0, def: 0, spd: 0 },
            status: null,
            moves: [],
          },
          opponent: {
            studentId: "defender-1",
            studentName: "Defender",
            speciesName: "Testmon",
            formIcon: "x",
            currentHp: 100,
            maxHp: 100,
            energy: 0,
            baseStats: { hp: 100, atk: 45, def: 35, spd: 25 },
            statStages: { atk: 0, def: 0, spd: 0 },
            status: null,
            moves: [],
          },
          turns: [],
          totalTurns: 0,
          status: "active",
        },
      })
      .mockResolvedValueOnce(null);
    mockStudentFindUnique
      .mockResolvedValueOnce({ gold: 100, inventory: [], battleLoadout: [] })
      .mockResolvedValueOnce({ gold: 50, inventory: [], battleLoadout: [] });
    mockBattleSessionCount.mockResolvedValue(0);
    mockStudentUpdate
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ gold: 130 });
    mockEconomyTransactionCreate.mockResolvedValue({ id: "ledger-1" });

    const { POST } = await import("@/app/api/classrooms/[id]/battle/route");
    const request = {
      json: vi.fn().mockResolvedValue({
        challengerId: "challenger-1",
        defenderId: "defender-1",
        studentCode: "abc123",
        mode: "turnInteractive",
        sessionId: "507f1f77bcf86cd799439011",
        actorSide: "opponent",
        moveId: "basic",
      }),
    } as never;

    const response = await POST(request, {
      params: Promise.resolve({ id: "class-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      actorSide: "player",
      faintedId: "defender-1",
      totalTurns: 1,
      final: {
        winnerId: "challenger-1",
        requestedGoldReward: 30,
        goldReward: 30,
        rewardBlockedReason: null,
      },
    });
    expect(mockBattleSessionUpdateMany).toHaveBeenCalledWith({
      where: { id: "507f1f77bcf86cd799439011", interactivePending: true, stateVersion: 0 },
      data: expect.objectContaining({
        interactivePending: false,
        winnerId: "challenger-1",
        goldReward: 30,
        stateVersion: { increment: 1 },
      }),
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
        sourceRefId: "507f1f77bcf86cd799439011",
        idempotencyKey: "battle:507f1f77bcf86cd799439011:reward",
        metadata: expect.objectContaining({
          mode: "interactive_server",
          winnerId: "challenger-1",
          requestedGoldReward: 30,
          goldReward: 30,
          totalTurns: 1,
        }),
      }),
    });
  });

  it("refuses to spend a server-owned player action without a player move", async () => {
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
        gold: 100,
        inventory: [],
        battleLoadout: [],
      })
      .mockResolvedValueOnce({
        id: "defender-1",
        name: "Defender",
        behaviorPoints: 8,
        gold: 50,
        inventory: [],
        battleLoadout: [],
      });
    mockBattleSessionFindFirst.mockResolvedValueOnce({
      id: "507f1f77bcf86cd799439012",
      classId: "class-1",
      challengerId: "challenger-1",
      defenderId: "defender-1",
      interactivePending: true,
      challengerBattleItems: [],
      defenderBattleItems: [],
      stateVersion: 0,
      createdAt: new Date(),
      result: {
        mode: "interactive_server",
        seed: 123,
        rngCursor: 0,
        player: {
          studentId: "challenger-1",
          studentName: "Challenger",
          speciesName: "Testmon",
          formIcon: "x",
          currentHp: 100,
          maxHp: 100,
          energy: 0,
          baseStats: { hp: 100, atk: 50, def: 40, spd: 30 },
          statStages: { atk: 0, def: 0, spd: 0 },
          status: null,
          moves: [],
        },
        opponent: {
          studentId: "defender-1",
          studentName: "Defender",
          speciesName: "Testmon",
          formIcon: "x",
          currentHp: 100,
          maxHp: 100,
          energy: 0,
          baseStats: { hp: 100, atk: 45, def: 35, spd: 25 },
          statStages: { atk: 0, def: 0, spd: 0 },
          status: null,
          moves: [],
        },
        turns: [],
        totalTurns: 0,
        status: "active",
      },
    });

    const { POST } = await import("@/app/api/classrooms/[id]/battle/route");
    const request = {
      json: vi.fn().mockResolvedValue({
        challengerId: "challenger-1",
        defenderId: "defender-1",
        studentCode: "abc123",
        mode: "turnInteractive",
        sessionId: "507f1f77bcf86cd799439012",
        actorSide: "opponent",
      }),
    } as never;

    const response = await POST(request, {
      params: Promise.resolve({ id: "class-1" }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "PLAYER_ACTION_REQUIRED",
      actorSide: "player",
    });
    expect(mockBattleSessionUpdateMany).not.toHaveBeenCalled();
    expect(mockStudentUpdate).not.toHaveBeenCalled();
    expect(mockEconomyTransactionCreate).not.toHaveBeenCalled();
  });

  it("consumes defender battle items when an interactive battle finalizes", async () => {
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
        gold: 100,
        inventory: [],
        battleLoadout: [],
      })
      .mockResolvedValueOnce({
        id: "defender-1",
        name: "Defender",
        behaviorPoints: 8,
        gold: 50,
        inventory: ["item_buckler", "item_lucky_coin", "frame_fire_t1"],
        battleLoadout: ["item_buckler", "item_lucky_coin"],
      });
    mockBattleSessionFindFirst
      .mockResolvedValueOnce({
        id: "507f1f77bcf86cd799439013",
        classId: "class-1",
        challengerId: "challenger-1",
        defenderId: "defender-1",
        interactivePending: true,
        challengerBattleItems: [],
        defenderBattleItems: ["item_buckler", "item_lucky_coin"],
        createdAt: new Date(),
        result: {
          mode: "interactive_server",
          seed: 123,
          rngCursor: 0,
          player: {
            studentId: "challenger-1",
            studentName: "Challenger",
            speciesName: "Testmon",
            formIcon: "x",
            currentHp: 100,
            maxHp: 100,
            energy: 0,
            baseStats: { hp: 100, atk: 50, def: 40, spd: 30 },
            statStages: { atk: 0, def: 0, spd: 0 },
            status: null,
            moves: [],
          },
          opponent: {
            studentId: "defender-1",
            studentName: "Defender",
            speciesName: "Testmon",
            formIcon: "x",
            currentHp: 100,
            maxHp: 100,
            energy: 0,
            baseStats: { hp: 100, atk: 45, def: 35, spd: 25 },
            statStages: { atk: 0, def: 0, spd: 0 },
            status: null,
            moves: [],
          },
          turns: [],
          totalTurns: 0,
          status: "active",
        },
      })
      .mockResolvedValueOnce(null);
    mockStudentFindUnique
      .mockResolvedValueOnce({ gold: 100, inventory: [], battleLoadout: [] })
      .mockResolvedValueOnce({
        gold: 50,
        inventory: ["item_buckler", "item_lucky_coin", "frame_fire_t1"],
        battleLoadout: ["item_buckler", "item_lucky_coin"],
      });
    mockBattleSessionCount.mockResolvedValue(0);
    mockStudentUpdate
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ gold: 130 });
    mockEconomyTransactionCreate.mockResolvedValue({ id: "ledger-1" });

    const { POST } = await import("@/app/api/classrooms/[id]/battle/route");
    const request = {
      json: vi.fn().mockResolvedValue({
        challengerId: "challenger-1",
        defenderId: "defender-1",
        studentCode: "abc123",
        mode: "turnInteractive",
        sessionId: "507f1f77bcf86cd799439013",
        actorSide: "player",
        moveId: "basic",
      }),
    } as never;

    const response = await POST(request, {
      params: Promise.resolve({ id: "class-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockStudentUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: "defender-1" },
      data: {
        inventory: ["frame_fire_t1"],
        battleLoadout: [],
      },
    });
    expect(mockBattleSessionUpdateMany).toHaveBeenCalledWith({
      where: { id: "507f1f77bcf86cd799439013", interactivePending: true, stateVersion: 0 },
      data: expect.objectContaining({
        interactivePending: false,
        winnerId: "challenger-1",
        stateVersion: { increment: 1 },
        result: expect.objectContaining({
          rewardPolicy: expect.any(Object),
        }),
      }),
    });
  });

  it("rejects stale interactive finalization without awarding gold or ledger rows", async () => {
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
        gold: 100,
        inventory: [],
        battleLoadout: [],
      })
      .mockResolvedValueOnce({
        id: "defender-1",
        name: "Defender",
        behaviorPoints: 8,
        gold: 50,
        inventory: [],
        battleLoadout: [],
      });
    mockBattleSessionFindFirst
      .mockResolvedValueOnce({
        id: "507f1f77bcf86cd799439014",
        classId: "class-1",
        challengerId: "challenger-1",
        defenderId: "defender-1",
        interactivePending: true,
        challengerBattleItems: [],
        defenderBattleItems: [],
        stateVersion: 3,
        createdAt: new Date(),
        result: {
          mode: "interactive_server",
          seed: 123,
          rngCursor: 0,
          player: {
            studentId: "challenger-1",
            studentName: "Challenger",
            speciesName: "Testmon",
            formIcon: "x",
            currentHp: 100,
            maxHp: 100,
            energy: 0,
            baseStats: { hp: 100, atk: 50, def: 40, spd: 30 },
            statStages: { atk: 0, def: 0, spd: 0 },
            status: null,
            moves: [],
          },
          opponent: {
            studentId: "defender-1",
            studentName: "Defender",
            speciesName: "Testmon",
            formIcon: "x",
            currentHp: 100,
            maxHp: 100,
            energy: 0,
            baseStats: { hp: 100, atk: 45, def: 35, spd: 25 },
            statStages: { atk: 0, def: 0, spd: 0 },
            status: null,
            moves: [],
          },
          turns: [],
          totalTurns: 0,
          status: "active",
        },
      })
      .mockResolvedValueOnce(null);
    mockStudentFindUnique
      .mockResolvedValueOnce({ gold: 100, inventory: [], battleLoadout: [] })
      .mockResolvedValueOnce({ gold: 50, inventory: [], battleLoadout: [] });
    mockBattleSessionCount.mockResolvedValue(0);
    mockBattleSessionUpdateMany.mockResolvedValueOnce({ count: 0 });

    const { POST } = await import("@/app/api/classrooms/[id]/battle/route");
    const request = {
      json: vi.fn().mockResolvedValue({
        challengerId: "challenger-1",
        defenderId: "defender-1",
        studentCode: "abc123",
        mode: "turnInteractive",
        sessionId: "507f1f77bcf86cd799439014",
        actorSide: "player",
        moveId: "basic",
      }),
    } as never;

    const response = await POST(request, {
      params: Promise.resolve({ id: "class-1" }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "TURN_CONFLICT" });
    expect(mockBattleSessionUpdateMany).toHaveBeenCalledWith({
      where: { id: "507f1f77bcf86cd799439014", interactivePending: true, stateVersion: 3 },
      data: expect.objectContaining({
        interactivePending: false,
        winnerId: "challenger-1",
        stateVersion: { increment: 1 },
      }),
    });
    expect(mockStudentUpdate).not.toHaveBeenCalled();
    expect(mockEconomyTransactionCreate).not.toHaveBeenCalled();
  });

  it("expires abandoned interactive sessions before resolving another turn", async () => {
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
        gold: 100,
        inventory: [],
        battleLoadout: [],
      })
      .mockResolvedValueOnce({
        id: "defender-1",
        name: "Defender",
        behaviorPoints: 8,
        gold: 50,
        inventory: [],
        battleLoadout: [],
      });
    mockBattleSessionFindFirst.mockResolvedValueOnce({
      id: "507f1f77bcf86cd799439011",
      classId: "class-1",
      challengerId: "challenger-1",
      defenderId: "defender-1",
      interactivePending: true,
      challengerBattleItems: [],
      defenderBattleItems: [],
      createdAt: new Date(Date.now() - 46 * 60 * 1000),
      result: {
        mode: "interactive_server",
        seed: 123,
        rngCursor: 0,
        player: {},
        opponent: {},
        turns: [],
        totalTurns: 0,
        status: "active",
      },
    });
    const { POST } = await import("@/app/api/classrooms/[id]/battle/route");
    const request = {
      json: vi.fn().mockResolvedValue({
        challengerId: "challenger-1",
        defenderId: "defender-1",
        studentCode: "abc123",
        mode: "turnInteractive",
        sessionId: "507f1f77bcf86cd799439011",
      }),
    } as never;

    const response = await POST(request, {
      params: Promise.resolve({ id: "class-1" }),
    });

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: "INTERACTIVE_SESSION_EXPIRED",
    });
    expect(mockBattleSessionUpdateMany).toHaveBeenCalledWith({
      where: { id: "507f1f77bcf86cd799439011", interactivePending: true, stateVersion: 0 },
      data: expect.objectContaining({
        interactivePending: false,
        stateVersion: { increment: 1 },
        result: expect.objectContaining({ mode: "interactive_expired" }),
      }),
    });
    expect(mockEconomyTransactionCreate).not.toHaveBeenCalled();
  });
});
