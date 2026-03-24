export type BattleAnimationEventType =
  | "QUESTION_START"
  | "ANSWER_RESULT"
  | "ACTION_ATTACK"
  | "ACTION_DEFEND"
  | "ACTION_SKILL_CAST"
  | "DAMAGE_APPLIED"
  | "HEAL_APPLIED"
  | "RESOURCE_GAINED"
  | "UNIT_DEFEATED"
  | "BANNER";

export type BattleAnimationEvent = {
  id: string;
  type: BattleAnimationEventType;
  timestamp: number;
  sourceId?: string;
  targetId?: string;
  sourceRole?: "player" | "enemy";
  amount?: number;
  label?: string;
  skillId?: string;
  fxPreset?: "slash" | "arcane" | "shield" | "poison" | "ice" | "thunder" | "heal" | "buff" | "debuff" | "pierce" | "execute";
  colorClass?: string;
  correct?: boolean;
  resourceType?: "STAMINA" | "MP" | "HP";
  tone?: "neutral" | "success" | "danger" | "skill" | "warning";
};

// Socket payload emitted by server. Client will add id/timestamp locally.
export type BattleRuntimeEventPayload = Omit<BattleAnimationEvent, "id" | "timestamp">;

export function createBattleEvent(
  event: Omit<BattleAnimationEvent, "id" | "timestamp">
): BattleAnimationEvent {
  return {
    ...event,
    id: `${event.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  };
}
