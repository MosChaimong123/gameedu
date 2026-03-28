"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useBattleAnimation = useBattleAnimation;
const react_1 = require("react");
const battle_animation_map_1 = require("@/components/battle/battle-animation-map");
const initialState = {
    playerPose: "idle",
    enemyPose: "idle",
    shakeKey: 0,
    banner: null,
    feedbackSplash: null,
    popups: [],
    activeSkillLabel: null,
    playerStatuses: [],
    enemyStatuses: [],
    activeFx: null,
};
function useBattleAnimation({ events, playerId, enemyId, reducedMotion = false, }) {
    const [state, setState] = (0, react_1.useState)(initialState);
    const processedRef = (0, react_1.useRef)(0);
    const queueStatus = (target, status, durationMs = 3400) => {
        setState((current) => ({
            ...current,
            playerStatuses: target === "player"
                ? [...current.playerStatuses.filter((item) => item.kind !== status.kind), status]
                : current.playerStatuses,
            enemyStatuses: target === "enemy"
                ? [...current.enemyStatuses.filter((item) => item.kind !== status.kind), status]
                : current.enemyStatuses,
        }));
        window.setTimeout(() => {
            setState((current) => ({
                ...current,
                playerStatuses: target === "player"
                    ? current.playerStatuses.filter((item) => item.id !== status.id)
                    : current.playerStatuses,
                enemyStatuses: target === "enemy"
                    ? current.enemyStatuses.filter((item) => item.id !== status.id)
                    : current.enemyStatuses,
            }));
        }, durationMs);
    };
    (0, react_1.useEffect)(() => {
        if (processedRef.current >= events.length)
            return;
        const newEvents = events.slice(processedRef.current);
        processedRef.current = events.length;
        newEvents.forEach((event) => {
            switch (event.type) {
                case "ACTION_ATTACK": {
                    const isEnemySource = event.sourceRole === "enemy" || (event.sourceId != null && event.sourceId !== playerId);
                    setState((current) => ({
                        ...current,
                        playerPose: isEnemySource ? current.playerPose : "attack",
                        enemyPose: isEnemySource ? "attack" : current.enemyPose,
                        activeSkillLabel: null,
                        activeFx: {
                            id: event.id,
                            label: event.label || "โจมตี",
                            preset: "slash",
                            colorClass: "from-amber-500/70 via-orange-400/35 to-transparent",
                            target: isEnemySource ? "player" : "enemy",
                        },
                    }));
                    window.setTimeout(() => {
                        setState((current) => ({
                            ...current,
                            playerPose: current.playerPose === "attack" ? "idle" : current.playerPose,
                            enemyPose: current.enemyPose === "attack" ? "idle" : current.enemyPose,
                            activeFx: null,
                        }));
                    }, reducedMotion ? 140 : 320);
                    break;
                }
                case "ACTION_DEFEND": {
                    const isEnemySource = event.sourceRole === "enemy" || (event.sourceId != null && event.sourceId !== playerId);
                    queueStatus(isEnemySource ? "enemy" : "player", { id: `${event.id}-shield`, kind: "shield", label: "Guard" }, 2600);
                    setState((current) => ({
                        ...current,
                        playerPose: isEnemySource ? current.playerPose : "defend",
                        enemyPose: isEnemySource ? "defend" : current.enemyPose,
                        banner: { text: event.label || "ตั้งรับ", tone: event.tone || "neutral" },
                        activeFx: {
                            id: event.id,
                            label: event.label || "ตั้งรับ",
                            preset: "shield",
                            colorClass: "from-sky-500/70 via-cyan-400/35 to-transparent",
                            target: isEnemySource ? "enemy" : "player",
                        },
                    }));
                    window.setTimeout(() => {
                        setState((current) => ({
                            ...current,
                            playerPose: current.playerPose === "defend" ? "idle" : current.playerPose,
                            enemyPose: current.enemyPose === "defend" ? "idle" : current.enemyPose,
                            activeFx: null,
                        }));
                    }, reducedMotion ? 180 : 540);
                    window.setTimeout(() => {
                        setState((current) => ({ ...current, banner: null }));
                    }, reducedMotion ? 520 : 950);
                    break;
                }
                case "ACTION_SKILL_CAST": {
                    const isEnemySource = event.sourceRole === "enemy" || (event.sourceId != null && event.sourceId !== playerId);
                    const visual = event.fxPreset && event.colorClass
                        ? {
                            label: event.label || event.skillId || "Skill",
                            preset: event.fxPreset,
                            colorClass: event.colorClass,
                            effect: undefined,
                        }
                        : (0, battle_animation_map_1.resolveSkillVisual)(event.skillId);
                    const statusTargetForPreset = (() => {
                        switch (visual.preset) {
                            case "shield":
                            case "heal":
                            case "buff":
                                return isEnemySource ? "enemy" : "player";
                            default:
                                return event.targetId === playerId ? "player" : event.targetId === enemyId ? "enemy" : null;
                        }
                    })();
                    const statusForPreset = (() => {
                        var _a;
                        switch ((_a = visual.effect) !== null && _a !== void 0 ? _a : visual.preset) {
                            case "POISON":
                            case "poison":
                                return { kind: "poison", label: "Poison" };
                            case "STUN":
                            case "thunder":
                                return { kind: "stun", label: "Stun" };
                            case "SLOW":
                            case "ice":
                                return { kind: "frost", label: "Slow" };
                            case "BUFF_DEF":
                            case "DEFEND":
                            case "shield":
                                return { kind: "shield", label: "Shield" };
                            case "HEAL":
                            case "REGEN":
                            case "heal":
                                return { kind: "regen", label: "Regen" };
                            case "BUFF_ATK":
                            case "CRIT_BUFF":
                            case "buff":
                                return { kind: "buff", label: "Buff" };
                            case "DEBUFF_ATK":
                            case "DEBUFF":
                            case "debuff":
                            case "DEF_BREAK":
                            case "ARMOR_PIERCE":
                            case "pierce":
                            case "EXECUTE":
                            case "execute":
                                return { kind: "debuff", label: "Break" };
                            default:
                                return null;
                        }
                    })();
                    if (statusTargetForPreset && statusForPreset) {
                        queueStatus(statusTargetForPreset, {
                            id: `${event.id}-${statusForPreset.kind}`,
                            kind: statusForPreset.kind,
                            label: statusForPreset.label,
                        });
                    }
                    const target = event.targetId === playerId ? "player" : event.targetId === enemyId ? "enemy" : "center";
                    setState((current) => ({
                        ...current,
                        playerPose: isEnemySource ? current.playerPose : "cast",
                        enemyPose: isEnemySource ? "cast" : current.enemyPose,
                        activeSkillLabel: !isEnemySource ? visual.label : null,
                        banner: { text: visual.label, tone: "skill" },
                        activeFx: {
                            id: event.id,
                            label: visual.label,
                            preset: visual.preset,
                            colorClass: visual.colorClass,
                            target,
                        },
                    }));
                    window.setTimeout(() => {
                        setState((current) => ({
                            ...current,
                            playerPose: current.playerPose === "cast" ? "idle" : current.playerPose,
                            enemyPose: current.enemyPose === "cast" ? "idle" : current.enemyPose,
                            activeSkillLabel: null,
                            activeFx: null,
                        }));
                    }, reducedMotion ? 180 : 520);
                    window.setTimeout(() => {
                        setState((current) => ({ ...current, banner: null }));
                    }, reducedMotion ? 560 : 1050);
                    break;
                }
                case "DAMAGE_APPLIED": {
                    const anchor = event.targetId === playerId ? "player" : event.targetId === enemyId ? "enemy" : "center";
                    const isEnemyHit = anchor === "enemy";
                    setState((current) => {
                        var _a;
                        return ({
                            ...current,
                            shakeKey: reducedMotion ? current.shakeKey : current.shakeKey + 1,
                            enemyPose: isEnemyHit ? "hit" : current.enemyPose,
                            playerPose: anchor === "player" ? "hit" : current.playerPose,
                            popups: [
                                ...current.popups,
                                {
                                    id: event.id,
                                    text: `-${(_a = event.amount) !== null && _a !== void 0 ? _a : 0}`,
                                    tone: event.correct ? "crit" : "damage",
                                    anchor,
                                },
                            ],
                        });
                    });
                    window.setTimeout(() => {
                        setState((current) => ({
                            ...current,
                            enemyPose: current.enemyPose === "hit" ? "idle" : current.enemyPose,
                            playerPose: current.playerPose === "hit" ? "idle" : current.playerPose,
                        }));
                    }, reducedMotion ? 110 : 260);
                    window.setTimeout(() => {
                        setState((current) => ({
                            ...current,
                            popups: current.popups.filter((popup) => popup.id !== event.id),
                        }));
                    }, reducedMotion ? 760 : 1100);
                    break;
                }
                case "HEAL_APPLIED":
                case "RESOURCE_GAINED": {
                    const anchor = event.targetId === playerId ? "player" : event.targetId === enemyId ? "enemy" : "center";
                    const prefix = event.type === "HEAL_APPLIED" ? "+" : "+";
                    const suffix = event.type === "RESOURCE_GAINED"
                        ? ` ${event.resourceType === "STAMINA" ? "Stamina" : event.resourceType === "MP" ? "MP" : "HP"}`
                        : "";
                    setState((current) => {
                        var _a;
                        return ({
                            ...current,
                            popups: [
                                ...current.popups,
                                {
                                    id: event.id,
                                    text: `${prefix}${(_a = event.amount) !== null && _a !== void 0 ? _a : 0}${suffix}`,
                                    tone: event.type === "HEAL_APPLIED" ? "heal" : "resource",
                                    anchor,
                                },
                            ],
                        });
                    });
                    window.setTimeout(() => {
                        setState((current) => ({
                            ...current,
                            popups: current.popups.filter((popup) => popup.id !== event.id),
                        }));
                    }, reducedMotion ? 760 : 1100);
                    break;
                }
                case "ANSWER_RESULT": {
                    setState((current) => ({
                        ...current,
                        feedbackSplash: {
                            label: event.correct ? "ถูกต้อง!" : "ผิด!",
                            tone: event.correct ? "success" : "danger",
                        },
                    }));
                    window.setTimeout(() => {
                        setState((current) => ({ ...current, feedbackSplash: null }));
                    }, reducedMotion ? 520 : 900);
                    break;
                }
                case "UNIT_DEFEATED": {
                    setState((current) => ({
                        ...current,
                        enemyPose: "defeated",
                        banner: { text: event.label || "ศัตรูถูกกำจัด", tone: event.tone || "success" },
                    }));
                    window.setTimeout(() => {
                        setState((current) => ({ ...current, banner: null }));
                    }, reducedMotion ? 650 : 1200);
                    break;
                }
                case "BANNER": {
                    setState((current) => ({
                        ...current,
                        banner: { text: event.label || "", tone: event.tone || "neutral" },
                    }));
                    window.setTimeout(() => {
                        setState((current) => ({ ...current, banner: null }));
                    }, reducedMotion ? 650 : 1200);
                    break;
                }
                default:
                    break;
            }
        });
    }, [enemyId, events, playerId, reducedMotion]);
    return state;
}
