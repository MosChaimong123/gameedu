// ============================================================
// Negamon Classroom RPG - Default Monster Species
// Reworked starter roster aligned to the V2 battle system.
// ============================================================

import type { MonsterSpecies, PassiveAbility } from "./types/negamon";

const ABILITY_PREDATOR_HEAT: PassiveAbility = {
    id: "rage_mode",
    name: "Predator Heat",
    desc: "When HP falls below 50%, ATK increases by 25% once.",
};

const ABILITY_STORM_EDGE: PassiveAbility = {
    id: "aerial_strike",
    name: "Storm Edge",
    desc: "Damaging moves gain +20% critical chance.",
};

const ABILITY_GRAVE_HIDE: PassiveAbility = {
    id: "iron_shell",
    name: "Grave Hide",
    desc: "DEF increases by 10% throughout the battle.",
};

const ABILITY_MOON_BLESSING: PassiveAbility = {
    id: "guardian_scale",
    name: "Moon Blessing",
    desc: "When HP falls below 30%, restore 15% HP once.",
};

const ABILITY_BLACKOUT_CORE: PassiveAbility = {
    id: "volt_flow",
    name: "Blackout Core",
    desc: "Restore 15 extra EN at the end of each turn.",
};

const ABILITY_TITAN_CURRENT: PassiveAbility = {
    id: "acid_rain",
    name: "Titan Current",
    desc: "Poisoned enemies take an extra 2% max HP damage each end turn.",
};

export const DEFAULT_NEGAMON_SPECIES: MonsterSpecies[] = [
    {
        id: "pyronox",
        name: "Pyronox",
        type: "FIRE",
        type2: "DARK",
        baseStats: { hp: 320, atk: 196, def: 110, spd: 162 },
        forms: [
            { rank: 0, name: "Cinder Egg", icon: "🥚", color: "#94a3b8" },
            { rank: 1, name: "Coal Cub", icon: "🐾", color: "#ef4444" },
            { rank: 2, name: "Ash Prowler", icon: "🐺", color: "#f97316" },
            { rank: 3, name: "Pyronox", icon: "🔥", color: "#dc2626" },
            { rank: 4, name: "Inferno Fang", icon: "🦁", color: "#b91c1c" },
            { rank: 5, name: "Dreadflame Rex", icon: "👹", color: "#7f1d1d" },
        ],
        ability: ABILITY_PREDATOR_HEAT,
        moves: [
            { id: "pyronox-ember-fang", name: "Ember Fang", type: "FIRE", category: "PHYSICAL", power: 34, accuracy: 95, learnRank: 3 },
            { id: "pyronox-shadow-rend", name: "Shadow Rend", type: "DARK", category: "PHYSICAL", power: 44, accuracy: 92, learnRank: 4, effect: "IGNORE_DEF", effectChance: 100, effectIgnoreDefRetained: 0.5 },
            { id: "pyronox-war-cry", name: "War Cry", type: "DARK", category: "STATUS", power: 0, accuracy: 100, learnRank: 5, effect: "BOOST_ATK", effectChance: 100 },
            { id: "pyronox-hell-dive", name: "Hell Dive", type: "FIRE", category: "SPECIAL", power: 52, accuracy: 76, learnRank: 6, effect: "BURN", effectChance: 100 },
        ],
    },
    {
        id: "aerolisk",
        name: "Aerolisk",
        type: "WIND",
        type2: "THUNDER",
        baseStats: { hp: 300, atk: 178, def: 118, spd: 194 },
        forms: [
            { rank: 0, name: "Storm Egg", icon: "🥚", color: "#94a3b8" },
            { rank: 1, name: "Breeze Chick", icon: "🐣", color: "#22d3ee" },
            { rank: 2, name: "Cloud Talon", icon: "🕊️", color: "#38bdf8" },
            { rank: 3, name: "Aerolisk", icon: "🦅", color: "#0ea5e9" },
            { rank: 4, name: "Sky Razor", icon: "⚡", color: "#eab308" },
            { rank: 5, name: "Tempest Raptor", icon: "🌩️", color: "#ca8a04" },
        ],
        ability: ABILITY_STORM_EDGE,
        moves: [
            { id: "aerolisk-gale-cut", name: "Gale Cut", type: "WIND", category: "PHYSICAL", power: 32, accuracy: 100, learnRank: 3 },
            { id: "aerolisk-spark-lance", name: "Spark Lance", type: "THUNDER", category: "SPECIAL", power: 38, accuracy: 92, learnRank: 4, effect: "LOWER_DEF", effectChance: 100 },
            { id: "aerolisk-tail-rush", name: "Tail Rush", type: "WIND", category: "STATUS", power: 0, accuracy: 100, learnRank: 5, effect: "BOOST_SPD_30", effectChance: 100 },
            { id: "aerolisk-skybreaker", name: "Skybreaker", type: "THUNDER", category: "PHYSICAL", power: 46, accuracy: 82, learnRank: 6, critBonus: 25 },
        ],
    },
    {
        id: "terranoir",
        name: "Terranoir",
        type: "EARTH",
        type2: "DARK",
        baseStats: { hp: 500, atk: 154, def: 156, spd: 78 },
        forms: [
            { rank: 0, name: "Buried Seed", icon: "🥚", color: "#94a3b8" },
            { rank: 1, name: "Dust Shell", icon: "🪨", color: "#78716c" },
            { rank: 2, name: "Tomb Hide", icon: "🦂", color: "#57534e" },
            { rank: 3, name: "Terranoir", icon: "🦬", color: "#44403c" },
            { rank: 4, name: "Grave Bastion", icon: "🗿", color: "#292524" },
            { rank: 5, name: "Catacomb Titan", icon: "🏰", color: "#1c1917" },
        ],
        ability: ABILITY_GRAVE_HIDE,
        moves: [
            { id: "terranoir-grave-slam", name: "Grave Slam", type: "EARTH", category: "PHYSICAL", power: 40, accuracy: 95, learnRank: 3 },
            { id: "terranoir-dread-mire", name: "Dread Mire", type: "DARK", category: "STATUS", power: 0, accuracy: 100, learnRank: 4, effect: "LOWER_ATK", effectChance: 100 },
            { id: "terranoir-bastion-hide", name: "Bastion Hide", type: "EARTH", category: "STATUS", power: 0, accuracy: 100, learnRank: 5, effect: "BOOST_DEF_20", effectChance: 100 },
            { id: "terranoir-catacomb-crush", name: "Catacomb Crush", type: "EARTH", category: "PHYSICAL", power: 56, accuracy: 82, learnRank: 6 },
        ],
    },
    {
        id: "lumilune",
        name: "Lumilune",
        type: "LIGHT",
        type2: "WATER",
        baseStats: { hp: 390, atk: 142, def: 138, spd: 150 },
        forms: [
            { rank: 0, name: "Pearl Egg", icon: "🥚", color: "#94a3b8" },
            { rank: 1, name: "Moon Drop", icon: "💧", color: "#cbd5e1" },
            { rank: 2, name: "Tide Wisp", icon: "🫧", color: "#7dd3fc" },
            { rank: 3, name: "Lumilune", icon: "🌙", color: "#f8fafc" },
            { rank: 4, name: "Pearl Saint", icon: "🕊️", color: "#e0f2fe" },
            { rank: 5, name: "Astral Tidemother", icon: "👼", color: "#bae6fd" },
        ],
        ability: ABILITY_MOON_BLESSING,
        moves: [
            { id: "lumilune-moon-splash", name: "Moon Splash", type: "WATER", category: "SPECIAL", power: 30, accuracy: 100, learnRank: 3 },
            { id: "lumilune-soft-glow", name: "Soft Glow", type: "LIGHT", category: "HEAL", power: 0, accuracy: 100, learnRank: 4, effect: "HEAL_25" },
            { id: "lumilune-prayer-veil", name: "Prayer Veil", type: "LIGHT", category: "STATUS", power: 0, accuracy: 100, learnRank: 5, effect: "BOOST_DEF", effectChance: 100 },
            { id: "lumilune-tidal-mercy", name: "Tidal Mercy", type: "WATER", category: "SPECIAL", power: 40, accuracy: 86, learnRank: 6, drainPct: 50 },
        ],
    },
    {
        id: "voltshade",
        name: "Voltshade",
        type: "THUNDER",
        type2: "DARK",
        baseStats: { hp: 340, atk: 166, def: 126, spd: 182 },
        forms: [
            { rank: 0, name: "Static Seed", icon: "🥚", color: "#94a3b8" },
            { rank: 1, name: "Wire Imp", icon: "🔌", color: "#818cf8" },
            { rank: 2, name: "Shade Arc", icon: "🌒", color: "#6366f1" },
            { rank: 3, name: "Voltshade", icon: "⚡", color: "#4f46e5" },
            { rank: 4, name: "Null Howler", icon: "🌩️", color: "#4338ca" },
            { rank: 5, name: "Eclipse Tyrant", icon: "🕶️", color: "#312e81" },
        ],
        ability: ABILITY_BLACKOUT_CORE,
        moves: [
            { id: "voltshade-static-bite", name: "Static Bite", type: "THUNDER", category: "SPECIAL", power: 31, accuracy: 95, learnRank: 3 },
            { id: "voltshade-blackout", name: "Blackout", type: "DARK", category: "STATUS", power: 0, accuracy: 100, learnRank: 4, effect: "LOWER_EN_REGEN", effectChance: 100, effectRegenPenalty: 15, effectDurationTurns: 2 },
            { id: "voltshade-chain-shock", name: "Chain Shock", type: "THUNDER", category: "SPECIAL", power: 40, accuracy: 88, learnRank: 5, effect: "PARALYZE", effectChance: 100, effectDurationTurns: 1, effectParalyzeFullSkip: true },
            { id: "voltshade-night-signal", name: "Night Signal", type: "DARK", category: "STATUS", power: 0, accuracy: 100, learnRank: 6, effect: "LOWER_SPD", effectChance: 100, effectDurationTurns: 2 },
        ],
    },
    {
        id: "tidemaw",
        name: "Tidemaw",
        type: "WATER",
        type2: "EARTH",
        baseStats: { hp: 470, atk: 176, def: 146, spd: 112 },
        forms: [
            { rank: 0, name: "Reef Egg", icon: "🥚", color: "#94a3b8" },
            { rank: 1, name: "Shore Pup", icon: "🦭", color: "#0f766e" },
            { rank: 2, name: "Coral Jaw", icon: "🐊", color: "#0d9488" },
            { rank: 3, name: "Tidemaw", icon: "🦈", color: "#0f766e" },
            { rank: 4, name: "Trench Breaker", icon: "🌊", color: "#115e59" },
            { rank: 5, name: "Abyss Titan", icon: "🐉", color: "#134e4a" },
        ],
        ability: ABILITY_TITAN_CURRENT,
        moves: [
            { id: "tidemaw-riptide-jaw", name: "Riptide Jaw", type: "WATER", category: "PHYSICAL", power: 35, accuracy: 94, learnRank: 3 },
            { id: "tidemaw-shell-breaker", name: "Shell Breaker", type: "EARTH", category: "PHYSICAL", power: 39, accuracy: 90, learnRank: 4, effect: "LOWER_DEF", effectChance: 100 },
            { id: "tidemaw-deep-feast", name: "Deep Feast", type: "WATER", category: "SPECIAL", power: 42, accuracy: 84, learnRank: 5, drainPct: 50 },
            { id: "tidemaw-reef-guard", name: "Reef Guard", type: "EARTH", category: "STATUS", power: 0, accuracy: 100, learnRank: 6, effect: "BOOST_DEF", effectChance: 100 },
        ],
    },
];

export function findSpeciesById(id: string): MonsterSpecies | undefined {
    return DEFAULT_NEGAMON_SPECIES.find((species) => species.id === id);
}

export function createDefaultNegamonSettings(): import("./types/negamon").NegamonSettings {
    return {
        enabled: false,
        allowStudentChoice: true,
        expPerPoint: 10,
        expPerAttendance: 20,
        species: DEFAULT_NEGAMON_SPECIES,
        studentMonsters: {},
    };
}
