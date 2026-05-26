import { db } from "@/lib/db";
import { getNegamonSettings, type LevelConfigInput } from "@/lib/classroom-utils";
import { toPrismaJson } from "@/lib/prisma-json";
import { createNegamonMonsterSnapshot } from "@/lib/game-negamon/core/monster-snapshot";
import {
    createNegamonShowdownBattleAdapter,
    type NegamonBattleChoiceV4,
} from "@/lib/game-negamon/engine-showdown";
import { normalizeStudentBattleKit } from "@/lib/shop-item-migration";
import { parseNegamonBattleSessionResultV4, type NegamonBattleSessionResultV4 } from "../core/session-v4";

export type StartNegamonBattleV4Input = {
    classId: string;
    challengerId: string;
    defenderId: string;
    studentCode: string;
};

export type ChooseNegamonBattleMoveV4Input = StartNegamonBattleV4Input & {
    sessionId: string;
    choiceRequestId: string;
    moveId: string;
    moveSlot?: number;
};

export type NegamonBattleActionResultV4 =
    | { ok: false; status: 400 | 403 | 404 | 409; body: Record<string, unknown> }
    | { ok: true; body: Record<string, unknown> };

function findSelectedChoice(
    choices: NegamonBattleChoiceV4[],
    input: { moveId?: string; moveSlot?: number }
) {
    return choices.find((choice) => {
        if (typeof input.moveSlot === "number" && choice.moveSlot === input.moveSlot) return true;
        if (input.moveId && choice.moveId === input.moveId) return true;
        return false;
    });
}

export async function startNegamonBattleV4(
    input: StartNegamonBattleV4Input
): Promise<NegamonBattleActionResultV4> {
    if (!input.challengerId || !input.defenderId || !input.studentCode || input.challengerId === input.defenderId) {
        return { ok: false, status: 400, body: { error: "INVALID_REQUEST" } };
    }

    const classroom = await db.classroom.findUnique({
        where: { id: input.classId },
        select: { id: true, gamifiedSettings: true, levelConfig: true },
    });
    if (!classroom) return { ok: false, status: 404, body: { error: "NOT_FOUND" } };

    const challenger = await db.student.findFirst({
        where: { id: input.challengerId, classId: input.classId, loginCode: input.studentCode },
        select: { id: true, name: true, behaviorPoints: true, inventory: true, battleLoadout: true, negamonSkills: true },
    });
    if (!challenger) return { ok: false, status: 403, body: { error: "FORBIDDEN" } };

    const defender = await db.student.findFirst({
        where: { id: input.defenderId, classId: input.classId },
        select: { id: true, name: true, behaviorPoints: true, inventory: true, battleLoadout: true, negamonSkills: true },
    });
    if (!defender) return { ok: false, status: 404, body: { error: "DEFENDER_NOT_FOUND" } };

    const negamon = getNegamonSettings(classroom.gamifiedSettings as Record<string, unknown>);
    if (!negamon?.enabled) return { ok: false, status: 400, body: { error: "NEGAMON_DISABLED" } };

    const challengerBattleKit = normalizeStudentBattleKit({
        inventory: challenger.inventory,
        battleLoadout: challenger.battleLoadout,
    });
    const defenderBattleKit = normalizeStudentBattleKit({
        inventory: defender.inventory,
        battleLoadout: defender.battleLoadout,
    });

    const player = createNegamonMonsterSnapshot({
        studentId: challenger.id,
        studentName: challenger.name,
        points: challenger.behaviorPoints,
        levelConfig: classroom.levelConfig as LevelConfigInput,
        negamonSettings: negamon,
        equippedSkillIds: Array.isArray(challenger.negamonSkills) ? (challenger.negamonSkills as string[]) : [],
        equippedItemIds: challengerBattleKit.battleLoadout,
    });
    const opponent = createNegamonMonsterSnapshot({
        studentId: defender.id,
        studentName: defender.name,
        points: defender.behaviorPoints,
        levelConfig: classroom.levelConfig as LevelConfigInput,
        negamonSettings: negamon,
        equippedSkillIds: Array.isArray(defender.negamonSkills) ? (defender.negamonSkills as string[]) : [],
        equippedItemIds: defenderBattleKit.battleLoadout,
    });

    if (!player || !opponent) {
        return { ok: false, status: 400, body: { error: "NO_MONSTER" } };
    }

    const adapter = createNegamonShowdownBattleAdapter();
    const state = await adapter.createBattle({
        battleId: `negamon-v4:${input.classId}:${input.challengerId}:${input.defenderId}`,
        seed: Date.now(),
        player,
        opponent,
    });

    const session = await db.battleSession.create({
        data: {
            classId: input.classId,
            challengerId: input.challengerId,
            defenderId: input.defenderId,
            result: toPrismaJson({
                mode: "negamon_battle_v4",
                engineVersion: "negamon_v4_showdown_adapter",
                status: "active",
                choiceRequestId: state.choiceRequestId,
                state,
            } satisfies NegamonBattleSessionResultV4),
            winnerId: null,
            goldReward: 0,
            interactivePending: true,
        },
    });

    const savedState = {
        ...state,
        battleId: session.id,
        choiceRequestId: `${session.id}:v4:${state.stateVersion}:${state.turn}`,
    };
    const result: NegamonBattleSessionResultV4 = {
        mode: "negamon_battle_v4",
        engineVersion: "negamon_v4_showdown_adapter",
        status: "active",
        choiceRequestId: savedState.choiceRequestId,
        state: savedState,
    };

    await db.battleSession.update({
        where: { id: session.id },
        data: { result: toPrismaJson(result) },
    });

    return {
        ok: true,
        body: {
            mode: result.mode,
            engineVersion: result.engineVersion,
            sessionId: session.id,
            choiceRequestId: result.choiceRequestId,
            state: result.state,
            validChoices: result.state.choices.player,
        },
    };
}

export async function chooseNegamonBattleMoveV4(
    input: ChooseNegamonBattleMoveV4Input
): Promise<NegamonBattleActionResultV4> {
    if (!input.challengerId || !input.defenderId || !input.studentCode || !input.sessionId || !input.choiceRequestId) {
        return { ok: false, status: 400, body: { error: "INVALID_REQUEST" } };
    }

    const challenger = await db.student.findFirst({
        where: { id: input.challengerId, classId: input.classId, loginCode: input.studentCode },
        select: { id: true },
    });
    if (!challenger) return { ok: false, status: 403, body: { error: "FORBIDDEN" } };

    const session = await db.battleSession.findFirst({
        where: {
            id: input.sessionId,
            classId: input.classId,
            challengerId: input.challengerId,
            defenderId: input.defenderId,
        },
        select: {
            id: true,
            classId: true,
            challengerId: true,
            defenderId: true,
            winnerId: true,
            goldReward: true,
            interactivePending: true,
            stateVersion: true,
            createdAt: true,
            result: true,
        },
    });
    if (!session) return { ok: false, status: 404, body: { error: "SESSION_NOT_FOUND" } };

    const parsed = parseNegamonBattleSessionResultV4(session.result);
    if (!parsed) return { ok: false, status: 409, body: { error: "INVALID_SESSION_STATE" } };
    if (parsed.status === "finished") {
        return {
            ok: true,
            body: {
                mode: parsed.mode,
                engineVersion: parsed.engineVersion,
                choiceRequestId: parsed.choiceRequestId,
                state: parsed.state,
                validChoices: [],
                final: {
                    winnerId: parsed.winnerId ?? session.winnerId,
                    goldReward: parsed.goldReward ?? session.goldReward,
                },
            },
        };
    }

    if (parsed.choiceRequestId !== input.choiceRequestId) {
        return {
            ok: false,
            status: 409,
            body: {
                error: "STALE_CHOICE",
                choiceRequestId: parsed.choiceRequestId,
                state: parsed.state,
                validChoices: parsed.state.choices.player,
            },
        };
    }

    const selectedChoice = findSelectedChoice(parsed.state.choices.player, {
        moveId: input.moveId,
        moveSlot: input.moveSlot,
    });
    if (!selectedChoice) {
        return {
            ok: false,
            status: 409,
            body: {
                error: "CHOICE_REJECTED",
                choiceRequestId: parsed.choiceRequestId,
                state: parsed.state,
                validChoices: parsed.state.choices.player,
            },
        };
    }

    const adapter = createNegamonShowdownBattleAdapter();
    const resolved = await adapter.resolveTurn({
        state: parsed.state,
        playerAction: {
            actorSide: "player",
            kind: "move",
            moveId: selectedChoice.moveId,
            moveSlot: selectedChoice.moveSlot,
            targetSide: selectedChoice.targetSide,
        },
    });
    if (!resolved.ok) {
        return {
            ok: false,
            status: 409,
            body: {
                error: resolved.code ?? "CHOICE_REJECTED",
                state: resolved.state,
                validChoices: resolved.validChoices,
            },
        };
    }

    const winnerId =
        resolved.state.winner === "player"
            ? input.challengerId
            : resolved.state.winner === "opponent"
              ? input.defenderId
              : undefined;

    const nextResult: NegamonBattleSessionResultV4 = {
        mode: "negamon_battle_v4",
        engineVersion: "negamon_v4_showdown_adapter",
        status: resolved.state.phase === "ended" ? "finished" : "active",
        choiceRequestId: resolved.state.choiceRequestId,
        state: resolved.state,
        winnerId,
        goldReward: 0,
    };

    await db.battleSession.update({
        where: { id: session.id },
        data: {
            result: toPrismaJson(nextResult),
            winnerId: winnerId ?? null,
            goldReward: 0,
            interactivePending: resolved.state.phase !== "ended",
            stateVersion: { increment: 1 },
        },
    });

    return {
        ok: true,
        body: {
            mode: nextResult.mode,
            engineVersion: nextResult.engineVersion,
            choiceRequestId: nextResult.choiceRequestId,
            state: nextResult.state,
            validChoices: nextResult.state.phase === "ended" ? [] : nextResult.state.choices.player,
            final: winnerId
                ? {
                      winnerId,
                      goldReward: 0,
                  }
                : null,
        },
    };
}
