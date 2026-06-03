import { describe, expect, it, vi } from "vitest";
import { createDefaultNegamonSettings } from "@/lib/negamon-species";
import { finalizeNegamonBattleV4Completion } from "@/lib/game-negamon/server/battle-v4-completion";

function createDbStub() {
    const students = new Map<string, { gold: number; behaviorPoints: number; negamonSkills: string[] }>();
    const pointHistoryRows: Array<Array<{ studentId: string; value: number; reason: string }>> = [];
    const economyRows: Array<Record<string, unknown>> = [];

    const db = {
        battleSession: {
            count: vi.fn().mockResolvedValue(0),
            findFirst: vi.fn().mockResolvedValue(null),
        },
        student: {
            update: vi.fn(async ({ where, data }: { where: { id: string }; data: { gold?: { increment: number }; behaviorPoints?: { increment: number }; negamonSkills?: string[] } }) => {
                const current = students.get(where.id) ?? { gold: 0, behaviorPoints: 0, negamonSkills: [] };
                const next = {
                    gold: current.gold + (data.gold?.increment ?? 0),
                    behaviorPoints: current.behaviorPoints + (data.behaviorPoints?.increment ?? 0),
                    negamonSkills: data.negamonSkills ?? current.negamonSkills,
                };
                students.set(where.id, next);
                return next;
            }),
        },
        pointHistory: {
            createMany: vi.fn(async ({ data }: { data: Array<{ studentId: string; value: number; reason: string }> }) => {
                pointHistoryRows.push(data);
                return { count: data.length };
            }),
        },
        economyTransaction: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
                economyRows.push(data);
                return data;
            }),
        },
    };

    return { db, students, pointHistoryRows, economyRows };
}

function createFixtureStudents() {
    return {
        challenger: {
            id: "665000000000000000000001",
            name: "Challenger",
            behaviorPoints: 24,
            gold: 120,
            inventory: [],
            battleLoadout: [],
            negamonSkills: [],
            negamonSkillLoadout: [],
        },
        defender: {
            id: "665000000000000000000002",
            name: "Defender",
            behaviorPoints: 18,
            gold: 80,
            inventory: [],
            battleLoadout: [],
            negamonSkills: [],
            negamonSkillLoadout: [],
        },
    };
}

function createClassroomFixture() {
    const negamon = createDefaultNegamonSettings();
    negamon.enabled = true;
    negamon.studentMonsters = {
        "665000000000000000000001": "pyronox",
        "665000000000000000000002": "terranoir",
    };
    return {
        id: "66500000000000000000c001",
        gamifiedSettings: { negamon },
        levelConfig: null,
    };
}

describe("finalizeNegamonBattleV4Completion", () => {
    it("persists canonical winner rewards and both progression branches for a win", async () => {
        const { db, students, pointHistoryRows, economyRows } = createDbStub();
        const { challenger, defender } = createFixtureStudents();
        students.set(challenger.id, { gold: challenger.gold, behaviorPoints: challenger.behaviorPoints, negamonSkills: [] });
        students.set(defender.id, { gold: defender.gold, behaviorPoints: defender.behaviorPoints, negamonSkills: [] });

        const result = await finalizeNegamonBattleV4Completion({
            db: db as never,
            session: {
                id: "66500000000000000000b001",
                classId: "66500000000000000000c001",
                challengerId: challenger.id,
                defenderId: defender.id,
                createdAt: new Date("2026-05-31T10:00:00.000Z"),
            },
            classroom: createClassroomFixture(),
            challenger,
            defender,
            state: { winner: "player", turn: 6 } as never,
        });

        expect(result.result.winnerId).toBe(challenger.id);
        expect(result.result.loserId).toBe(defender.id);
        expect(result.result.goldReward).toBeGreaterThan(0);
        expect(result.result.rewardBlockedReason).toBeNull();
        expect(result.result.participantResults?.challenger.outcome).toBe("win");
        expect(result.result.participantResults?.defender.outcome).toBe("loss");
        expect(result.result.participantResults?.challenger.progression?.behaviorPointDelta).toBeGreaterThan(0);
        expect(result.result.participantResults?.defender.progression?.behaviorPointDelta).toBeGreaterThan(0);
        expect(db.student.update).toHaveBeenCalled();
        expect(pointHistoryRows.flat()).not.toHaveLength(0);
        expect(economyRows).toHaveLength(1);
        expect(economyRows[0]).toMatchObject({
            studentId: challenger.id,
            source: "battle",
            sourceRefId: "66500000000000000000b001",
        });
    });

    it("writes a zero-gold challenger branch when the challenger loses", async () => {
        const { db, students, economyRows } = createDbStub();
        const { challenger, defender } = createFixtureStudents();
        students.set(challenger.id, { gold: challenger.gold, behaviorPoints: challenger.behaviorPoints, negamonSkills: [] });
        students.set(defender.id, { gold: defender.gold, behaviorPoints: defender.behaviorPoints, negamonSkills: [] });

        const result = await finalizeNegamonBattleV4Completion({
            db: db as never,
            session: {
                id: "66500000000000000000b002",
                classId: "66500000000000000000c001",
                challengerId: challenger.id,
                defenderId: defender.id,
                createdAt: new Date("2026-05-31T10:00:00.000Z"),
            },
            classroom: createClassroomFixture(),
            challenger,
            defender,
            state: { winner: "opponent", turn: 4 } as never,
        });

        expect(result.result.winnerId).toBe(defender.id);
        expect(result.result.participantResults?.challenger.goldReward).toBe(0);
        expect(result.result.participantResults?.challenger.outcome).toBe("loss");
        expect(result.result.participantResults?.defender.outcome).toBe("win");
        expect(economyRows).toHaveLength(1);
        expect(economyRows[0]).toMatchObject({ studentId: defender.id });
    });

    it("keeps early-exit sessions reward-safe while still writing participant outcomes", async () => {
        const { db, students, economyRows } = createDbStub();
        const { challenger, defender } = createFixtureStudents();
        students.set(challenger.id, { gold: challenger.gold, behaviorPoints: challenger.behaviorPoints, negamonSkills: [] });
        students.set(defender.id, { gold: defender.gold, behaviorPoints: defender.behaviorPoints, negamonSkills: [] });

        const result = await finalizeNegamonBattleV4Completion({
            db: db as never,
            session: {
                id: "66500000000000000000b003",
                classId: "66500000000000000000c001",
                challengerId: challenger.id,
                defenderId: defender.id,
                createdAt: new Date("2026-05-31T10:00:00.000Z"),
            },
            classroom: createClassroomFixture(),
            challenger,
            defender,
            state: { winner: "opponent", turn: 2 } as never,
            finishReason: "early_exit",
        });

        expect(result.result.finishReason).toBe("early_exit");
        expect(result.result.requestedGoldReward).toBe(0);
        expect(result.result.goldReward).toBe(0);
        expect(result.result.participantResults?.challenger.outcome).toBe("loss");
        expect(result.result.participantResults?.defender.outcome).toBe("win");
        expect(economyRows).toHaveLength(0);
    });
});
