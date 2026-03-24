"use client";

import { buildGlobalSkillMap } from "@/lib/game/job-system";

export type SkillFxPreset =
  | "slash"
  | "arcane"
  | "shield"
  | "poison"
  | "ice"
  | "thunder"
  | "heal"
  | "buff"
  | "debuff"
  | "pierce"
  | "execute";

export type SkillVisual = {
  label: string;
  effect?: string;
  preset: SkillFxPreset;
  colorClass: string;
};

export type EnemyAttackVisual = {
  label: string;
  preset: SkillFxPreset;
  colorClass: string;
};

const fallbackVisual: SkillVisual = {
  label: "Skill",
  preset: "arcane",
  colorClass: "from-violet-400/70 via-fuchsia-300/40 to-transparent",
};

export function resolveSkillVisual(skillId?: string): SkillVisual {
  if (!skillId) return fallbackVisual;

  const skill = buildGlobalSkillMap()[skillId];
  if (!skill) {
    return {
      ...fallbackVisual,
      label: skillId,
    };
  }

  const effect = skill.effect ?? "DAMAGE";

  const visualByEffect: Record<string, SkillVisual> = {
    DAMAGE: {
      label: skill.name,
      effect,
      preset: skill.damageBase === "MAG" ? "arcane" : "slash",
      colorClass:
        skill.damageBase === "MAG"
          ? "from-violet-500/75 via-sky-400/35 to-transparent"
          : "from-amber-500/70 via-orange-400/35 to-transparent",
    },
    DEFEND: {
      label: skill.name,
      effect,
      preset: "shield",
      colorClass: "from-sky-500/70 via-cyan-400/35 to-transparent",
    },
    BUFF_DEF: {
      label: skill.name,
      effect,
      preset: "shield",
      colorClass: "from-sky-500/70 via-cyan-400/35 to-transparent",
    },
    BUFF_ATK: {
      label: skill.name,
      effect,
      preset: "buff",
      colorClass: "from-rose-500/70 via-orange-400/35 to-transparent",
    },
    HEAL: {
      label: skill.name,
      effect,
      preset: "heal",
      colorClass: "from-emerald-500/70 via-lime-400/35 to-transparent",
    },
    REGEN: {
      label: skill.name,
      effect,
      preset: "heal",
      colorClass: "from-emerald-500/70 via-lime-400/35 to-transparent",
    },
    POISON: {
      label: skill.name,
      effect,
      preset: "poison",
      colorClass: "from-lime-500/70 via-emerald-400/35 to-transparent",
    },
    SLOW: {
      label: skill.name,
      effect,
      preset: "ice",
      colorClass: "from-sky-400/70 via-cyan-300/35 to-transparent",
    },
    STUN: {
      label: skill.name,
      effect,
      preset: "thunder",
      colorClass: "from-yellow-300/75 via-amber-300/40 to-transparent",
    },
    MANA_SURGE: {
      label: skill.name,
      effect,
      preset: "arcane",
      colorClass: "from-indigo-500/75 via-sky-400/35 to-transparent",
    },
    DEBUFF_ATK: {
      label: skill.name,
      effect,
      preset: "debuff",
      colorClass: "from-slate-500/70 via-cyan-400/25 to-transparent",
    },
    CRIT_BUFF: {
      label: skill.name,
      effect,
      preset: "buff",
      colorClass: "from-amber-400/75 via-yellow-300/35 to-transparent",
    },
    ARMOR_PIERCE: {
      label: skill.name,
      effect,
      preset: "pierce",
      colorClass: "from-red-500/75 via-orange-400/35 to-transparent",
    },
    DEF_BREAK: {
      label: skill.name,
      effect,
      preset: "pierce",
      colorClass: "from-red-500/75 via-orange-400/35 to-transparent",
    },
    EXECUTE: {
      label: skill.name,
      effect,
      preset: "execute",
      colorClass: "from-rose-600/75 via-red-500/35 to-transparent",
    },
  };

  return visualByEffect[effect] ?? {
    ...fallbackVisual,
    label: skill.name,
    effect,
  };
}

export function resolveEnemyAttackVisual(enemyName: string, mode: "boss" | "monster", damage: number): EnemyAttackVisual {
  const normalized = enemyName.toLowerCase();

  if (mode === "boss") {
    if (normalized.includes("dragon")) {
      return {
        label: damage >= 120 ? "Dragon Cataclysm" : "Dragon Flame",
        preset: damage >= 120 ? "execute" : "arcane",
        colorClass: "from-rose-600/80 via-orange-500/40 to-transparent",
      };
    }

    if (normalized.includes("lich") || normalized.includes("mage")) {
      return {
        label: "Void Burst",
        preset: "arcane",
        colorClass: "from-violet-600/80 via-indigo-500/40 to-transparent",
      };
    }

    return {
      label: damage >= 120 ? "Boss Ultimate" : "Boss Assault",
      preset: damage >= 120 ? "execute" : "pierce",
      colorClass: damage >= 120
        ? "from-rose-600/80 via-red-500/40 to-transparent"
        : "from-orange-500/80 via-amber-400/35 to-transparent",
    };
  }

  if (normalized.includes("slime")) {
    return {
      label: "Acid Splash",
      preset: "poison",
      colorClass: "from-lime-500/75 via-emerald-400/35 to-transparent",
    };
  }

  if (normalized.includes("goblin")) {
    return {
      label: "Dagger Rush",
      preset: "slash",
      colorClass: "from-amber-500/70 via-orange-400/35 to-transparent",
    };
  }

  if (normalized.includes("wolf")) {
    return {
      label: "Feral Pounce",
      preset: "pierce",
      colorClass: "from-slate-400/75 via-cyan-300/30 to-transparent",
    };
  }

  if (normalized.includes("orc")) {
    return {
      label: "Brutal Smash",
      preset: "execute",
      colorClass: "from-red-600/80 via-orange-500/35 to-transparent",
    };
  }

  if (normalized.includes("troll")) {
    return {
      label: "Earthbreaker",
      preset: "shield",
      colorClass: "from-emerald-700/75 via-lime-500/30 to-transparent",
    };
  }

  if (normalized.includes("dark")) {
    return {
      label: "Shadow Cleave",
      preset: "debuff",
      colorClass: "from-slate-600/80 via-violet-500/35 to-transparent",
    };
  }

  return {
    label: damage >= 80 ? "Monster Skill" : "Monster Strike",
    preset: damage >= 80 ? "pierce" : "slash",
    colorClass: damage >= 80
      ? "from-red-500/75 via-orange-500/35 to-transparent"
      : "from-amber-500/70 via-orange-400/35 to-transparent",
  };
}
