"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOB_CLASS_EXTENSIONS = void 0;
function skill(id, name, description, unlockLevel, damageMultiplier, cost = 28, options) {
    var _a;
    return {
        id,
        name,
        description,
        cost,
        costType: "MP",
        unlockLevel,
        effect: (_a = options === null || options === void 0 ? void 0 : options.effect) !== null && _a !== void 0 ? _a : "DAMAGE",
        damageMultiplier,
        ...((options === null || options === void 0 ? void 0 : options.isCrit) ? { isCrit: true } : {}),
        ...((options === null || options === void 0 ? void 0 : options.damageBase) ? { damageBase: options.damageBase } : {}),
        ...((options === null || options === void 0 ? void 0 : options.icon) ? { icon: options.icon } : {}),
    };
}
const d = (inheritsFrom, extraSkills, statMultiplierDelta) => ({
    inheritsFrom,
    extraSkills,
    statMultiplierDelta,
});
/** Advance + Master extensions (merged recursively in job-system). */
exports.JOB_CLASS_EXTENSIONS = {
    // ─── WARRIOR branch ───────────────────────────────────────────────────────
    KNIGHT: d("WARRIOR", [
        skill("knight_shield_bash", "Shield Bash", "Slam with shield for 2.4× ATK.", 20, 2.4, 28, { icon: "/assets/skills/knight_shield_bash.png" }),
        skill("knight_rally", "Rallying Cry", "Inspire allies — increases ATK 40% for 3 turns.", 25, 2.5, 28, { effect: "BUFF_ATK", icon: "/assets/skills/knight_rally.png" }),
    ], { def: 0.06, hp: 0.04 }),
    BERSERKER: d("WARRIOR", [
        skill("berserker_reckless", "Reckless Swing", "Wild blows for 2.6× ATK.", 20, 2.6, 28, { icon: "/assets/skills/berserker_reckless_swing.png" }),
        skill("berserker_bloodlust", "Bloodlust", "3.0× ATK life drain — heals 30% of damage dealt.", 25, 3.0, 28, { effect: "LIFESTEAL", icon: "/assets/skills/berserker_bloodlust.png" }),
    ], { atk: 0.08, def: -0.04 }),
    PALADIN: d("KNIGHT", [
        skill("paladin_smite", "Holy Smite", "3.0× ATK holy damage.", 50, 3.0, 28, { icon: "/assets/skills/paladin_holy_smite.png" }),
        skill("paladin_aegis", "Aegis", "3.3× ATK radiant burst — reduces incoming damage 50% for 2 turns.", 55, 3.3, 35, { effect: "BUFF_DEF", icon: "/assets/skills/paladin_aegis.png" }),
    ], { def: 0.05, mag: 0.05 }),
    GUARDIAN: d("KNIGHT", [
        skill("guardian_fortify", "Fortify", "2.8× ATK — fortifies self, reduces incoming damage 50% for 2 turns.", 50, 2.8, 28, { icon: "/assets/skills/guardian_fortify.png", effect: "BUFF_DEF" }),
        skill("guardian_bulwark", "Bulwark", "3.2× ATK crushing slam.", 55, 3.2, 35, { icon: "/assets/skills/guardian_bulwark.png" }),
    ], { hp: 0.08, def: 0.06 }),
    WARLORD: d("BERSERKER", [
        skill("warlord_command", "Warlord Command", "3.1× ATK commanding strike.", 50, 3.1, 28, { icon: "/assets/skills/warlord_command.png" }),
        skill("warlord_cleave", "Legion Cleave", "3.6× ATK wide slash.", 55, 3.6, 35, { icon: "/assets/skills/warlord_cleave.png" }),
    ], { atk: 0.1, hp: 0.05 }),
    "DEATH KNIGHT": d("BERSERKER", [
        skill("death_knight_necrotic", "Necrotic Slash", "3.0× ATK dark damage.", 50, 3.0, 28, { icon: "/assets/skills/death_knight_necrotic_slash.png" }),
        skill("death_knight_soul", "Soul Rend", "3.5× ATK life drain — heals 30% of damage dealt.", 55, 3.5, 38, { effect: "LIFESTEAL", icon: "/assets/skills/death_knight_soul_rend.png" }),
    ], { atk: 0.06, mag: 0.08 }),
    // ─── MAGE branch ────────────────────────────────────────────────────────────
    ARCHMAGE: d("MAGE", [
        skill("archspell_arcane_lance", "Arcane Lance", "2.8× MAG piercing bolt.", 20, 2.8, 28, { damageBase: "MAG", icon: "/assets/skills/archspell_arcane_lance.png" }),
        skill("archspell_mana_burn", "Mana Burn", "3.0× MAG searing wave.", 25, 3.0, 28, { damageBase: "MAG", icon: "/assets/skills/archspell_mana_burn.png" }),
    ], { mag: 0.1, mp: 0.05 }),
    WARLOCK: d("MAGE", [
        skill("warlock_dark_pact", "Dark Pact", "2.8× MAG shadow bolt.", 20, 2.8, 28, { damageBase: "MAG", icon: "/assets/skills/warlock_dark_pact.png" }),
        skill("warlock_curse", "Curse of Ruin", "3.1× MAG — applies poison DoT for 3 turns.", 25, 3.1, 28, { damageBase: "MAG", effect: "POISON", icon: "/assets/skills/warlock_curse.png" }),
    ], { mag: 0.08, hp: 0.05 }),
    "GRAND WIZARD": d("ARCHMAGE", [
        skill("grand_wizard_apocalypse", "Spell Apocalypse", "3.2× MAG cataclysm.", 50, 3.2, 28, { damageBase: "MAG", icon: "/assets/skills/grand_wizard_apocalypse.png" }),
        skill("grand_wizard_prism", "Prism Nova", "3.8× MAG rainbow burst.", 55, 3.8, 42, { damageBase: "MAG", icon: "/assets/skills/grand_wizard_prism.png" }),
    ], { mag: 0.12, mp: 0.08 }),
    ELEMENTALIST: d("ARCHMAGE", [
        skill("elementalist_fusion", "Element Fusion", "3.3× MAG tri-element.", 50, 3.3, 28, { damageBase: "MAG", icon: "/assets/skills/elementalist_fusion.png" }),
        skill("elementalist_storm", "Perfect Storm", "3.8× MAG tempest.", 55, 3.8, 42, { damageBase: "MAG", icon: "/assets/skills/elementalist_storm.png" }),
    ], { mag: 0.1, spd: 0.05 }),
    LICH: d("WARLOCK", [
        skill("lich_soul_reap", "Soul Reap", "3.0× MAG necrotic — heals 30% of damage dealt.", 50, 3.0, 28, { damageBase: "MAG", effect: "LIFESTEAL", icon: "/assets/skills/lich_soul_reap.png" }),
        skill("lich_frost_undead", "Frost of Undeath", "3.9× MAG frost — slows enemy 35% for 2 turns.", 55, 3.9, 44, { damageBase: "MAG", effect: "SLOW", icon: "/assets/skills/lich_frost_undead.png" }),
    ], { mag: 0.14, hp: -0.05 }),
    "SHADOW MAGE": d("WARLOCK", [
        skill("shadow_mage_void", "Void Lance", "3.1× MAG.", 50, 3.1, 28, { damageBase: "MAG", icon: "/assets/skills/shadow_mage_void.png" }),
        skill("shadow_mage_eclipse", "Eclipse", "3.8× MAG.", 55, 3.8, 42, { damageBase: "MAG", icon: "/assets/skills/shadow_mage_eclipse.png" }),
    ], { mag: 0.11, spd: 0.06 }),
    // ─── RANGER branch ─────────────────────────────────────────────────────────
    SNIPER: d("RANGER", [
        skill("sniper_pierce", "Armor Pierce Shot", "2.5× ATK true line. Breaks enemy armor — enemy takes +20% damage for 3 turns.", 20, 2.5, 28, { effect: "ARMOR_PIERCE", icon: "/assets/skills/sniper_pierce.png" }),
        skill("sniper_headshot", "Headshot", "4.0× ATK lethal aim (2.0× + CRIT).", 25, 2.0, 28, { isCrit: true, icon: "/assets/skills/sniper_headshot.png" }),
    ], { crit: 0.12, atk: 0.05 }),
    BEASTMASTER: d("RANGER", [
        skill("beastmaster_call", "Call Companion", "2.5× ATK beast strike.", 20, 2.5, 28, { icon: "/assets/skills/beastmaster_call_companion.png" }),
        skill("beastmaster_pack", "Pack Tactics", "3.0× ATK coordinated.", 25, 3.0, 28, { icon: "/assets/skills/beastmaster_pack_tactics.png" }),
    ], { atk: 0.04, spd: 0.06 }),
    HAWKEYE: d("SNIPER", [
        skill("hawkeye_deadshot", "Deadshot", "4.2× ATK (2.1× + CRIT).", 50, 2.1, 28, { isCrit: true, icon: "/assets/skills/hawkeye_deadshot.png" }),
        skill("hawkeye_ricochet", "Ricochet Mark", "4.6× ATK (2.3× + CRIT).", 55, 2.3, 38, { isCrit: true, icon: "/assets/skills/hawkeye_ricochet.png" }),
    ], { crit: 0.15, spd: 0.05 }),
    DEADEYE: d("SNIPER", [
        skill("deadeye_perfect", "Perfect Line", "4.4× ATK (2.2× + CRIT).", 50, 2.2, 28, { isCrit: true, icon: "/assets/skills/deadeye_perfect_line.png" }),
        skill("deadeye_barrage", "Fatal Barrage", "5.0× ATK (2.5× + CRIT).", 55, 2.5, 40, { isCrit: true, icon: "/assets/skills/deadeye_fatal_barrage.png" }),
    ], { crit: 0.18, atk: 0.06 }),
    "BEAST KING": d("BEASTMASTER", [
        skill("beast_king_primal", "Primal Roar", "3.0× ATK — terrifying roar weakens enemy ATK 30% for 2 turns.", 50, 3.0, 28, { effect: "DEBUFF_ATK", icon: "/assets/skills/beast_king_primal_roar.png" }),
        skill("beast_king_stampede", "Stampede", "3.6× ATK — breaks enemy armor, +20% damage for 3 turns.", 55, 3.6, 38, { effect: "ARMOR_PIERCE", icon: "/assets/skills/beast_king_stampede.png" }),
    ], { atk: 0.08, hp: 0.06 }),
    TAMER: d("BEASTMASTER", [
        skill("tamer_symbiosis", "Symbiosis Strike", "2.8× ATK — life drain, heals 30% of damage dealt.", 50, 2.8, 28, { effect: "LIFESTEAL", icon: "/assets/skills/tamer_symbiosis_strike.png" }),
        skill("tamer_apex", "Apex Predator", "3.5× ATK — marks prey, CRIT +30% for 3 turns.", 55, 3.5, 36, { effect: "CRIT_BUFF", icon: "/assets/skills/tamer_apex_predator.png" }),
    ], { spd: 0.08, crit: 0.08 }),
    // ─── HEALER branch ─────────────────────────────────────────────────────────
    SAINT: d("HEALER", [
        skill("saint_bless", "Blessed Lance", "2.6× MAG holy damage.", 20, 2.6, 28, { damageBase: "MAG", icon: "/assets/skills/saint_bless.png" }),
        skill("saint_purify", "Purifying Light", "3.0× MAG cleanse burst.", 25, 3.0, 28, { damageBase: "MAG", icon: "/assets/skills/saint_purify.png" }),
    ], { mag: 0.08, mp: 0.06 }),
    DRUID: d("HEALER", [
        skill("druid_thorn", "Thorn Volley", "2.5× MAG nature — applies poison for 3 turns.", 20, 2.5, 28, { damageBase: "MAG", effect: "POISON", icon: "/assets/skills/druid_thorn.png" }),
        skill("druid_wrath", "Wrath of Grove", "3.0× MAG — weakens enemy ATK 30% for 2 turns.", 25, 3.0, 28, { damageBase: "MAG", effect: "DEBUFF_ATK", icon: "/assets/skills/druid_wrath.png" }),
    ], { mag: 0.07, hp: 0.06 }),
    ARCHBISHOP: d("SAINT", [
        skill("archbishop_judgment", "Judgment Ray", "3.2× MAG holy light.", 50, 3.2, 28, { damageBase: "MAG", icon: "/assets/skills/archbishop_judgment.png" }),
        skill("archbishop_sanctify", "Sanctify", "3.7× MAG — heals 25% MAG per turn for 4 turns.", 55, 3.7, 40, { damageBase: "MAG", effect: "REGEN", icon: "/assets/skills/archbishop_sanctify.png" }),
    ], { mag: 0.1, mp: 0.1 }),
    "DIVINE HERALD": d("SAINT", [
        skill("divine_herald_trumpet", "Herald Trumpet", "3.3× MAG — increases ATK 40% for 3 turns.", 50, 3.3, 28, { damageBase: "MAG", effect: "BUFF_ATK", icon: "/assets/skills/divine_herald_trumpet.png" }),
        skill("divine_herald_miracle", "Miracle Wave", "3.8× MAG — heals 25% MAG per turn for 4 turns.", 55, 3.8, 42, { damageBase: "MAG", effect: "REGEN", icon: "/assets/skills/divine_herald_miracle.png" }),
    ], { mag: 0.11, hp: 0.05 }),
    "ELDER DRUID": d("DRUID", [
        skill("elder_druid_entangle", "World Entangle", "3.2× MAG — entangles enemy, 35% chance to skip attack for 2 turns.", 50, 3.2, 28, { damageBase: "MAG", effect: "SLOW", icon: "/assets/skills/elder_druid_entangle.png" }),
        skill("elder_druid_rebirth", "Verdant Rebirth", "3.6× MAG — heals 25% MAG per turn for 4 turns.", 55, 3.6, 38, { damageBase: "MAG", effect: "REGEN", icon: "/assets/skills/elder_druid_rebirth.png" }),
    ], { mag: 0.1, hp: 0.08 }),
    "NATURE WARDEN": d("DRUID", [
        skill("nature_warden_bark", "Ironbark Wrath", "3.1× MAG — fortify self, reduces damage 50% for 2 turns.", 50, 3.1, 28, { damageBase: "MAG", effect: "BUFF_DEF", icon: "/assets/skills/nature_warden_bark.png" }),
        skill("nature_warden_quake", "Earthquake Chant", "3.7× MAG earthquake — weakens enemy ATK 30% for 2 turns.", 55, 3.7, 40, { damageBase: "MAG", effect: "DEBUFF_ATK", icon: "/assets/skills/nature_warden_quake.png" }),
    ], { def: 0.08, mag: 0.09 }),
    // ─── ROGUE branch ──────────────────────────────────────────────────────────
    ASSASSIN: d("ROGUE", [
        skill("assassin_viper", "Viper Strike", "4.8× ATK (2.4× + CRIT) — applies poison for 3 turns.", 20, 2.4, 28, { isCrit: true, effect: "POISON", icon: "/assets/skills/assassin_viper.png" }),
        skill("assassin_mark", "Death Mark II", "3.0× ATK — marks enemy, enemy takes +50% damage for 3 turns.", 25, 3.0, 28, { effect: "DEF_BREAK", icon: "/assets/skills/assassin_mark.png" }),
    ], { crit: 0.1, spd: 0.06 }),
    DUELIST: d("ROGUE", [
        skill("duelist_riposte", "Riposte", "2.6× ATK counter.", 20, 2.6, 28, { icon: "/assets/skills/duelist_riposte.png" }),
        skill("duelist_bladestorm", "Bladestorm", "3.1× ATK flurry.", 25, 3.1, 28, { icon: "/assets/skills/duelist_bladestorm.png" }),
    ], { atk: 0.07, spd: 0.07 }),
    "SHADOW LORD": d("ASSASSIN", [
        skill("shadow_lord_umbral", "Umbral Crown", "4.4× ATK (2.2× + CRIT).", 50, 2.2, 28, { isCrit: true, icon: "/assets/skills/shadow_lord_umbral.png" }),
        skill("shadow_lord_dominate", "Dominate Shadow", "5.2× ATK (2.6× + CRIT).", 55, 2.6, 38, { isCrit: true, icon: "/assets/skills/shadow_lord_dominate.png" }),
    ], { crit: 0.12, spd: 0.08 }),
    PHANTOM: d("ASSASSIN", [
        skill("phantom_phase", "Phase Assault", "4.4× ATK (2.2× + CRIT).", 50, 2.2, 28, { isCrit: true, icon: "/assets/skills/phantom_phase.png" }),
        skill("phantom_afterimage", "Afterimage Kill", "5.0× ATK (2.5× + CRIT).", 55, 2.5, 40, { isCrit: true, icon: "/assets/skills/phantom_afterimage.png" }),
    ], { spd: 0.12, crit: 0.1 }),
    "BLADE MASTER": d("DUELIST", [
        skill("blade_master_thousand", "Thousand Cuts", "3.3× ATK.", 50, 3.3, 28, { icon: "/assets/skills/blade_master_thousand.png" }),
        skill("blade_master_final", "Final Form", "3.8× ATK.", 55, 3.8, 38, { icon: "/assets/skills/blade_master_final.png" }),
    ], { atk: 0.1, spd: 0.06 }),
    "SWORD SAINT": d("DUELIST", [
        skill("sword_saint_iaijutsu", "Iaijutsu", "4.6× ATK (2.3× + CRIT).", 50, 2.3, 28, { isCrit: true, icon: "/assets/skills/sword_saint_iaijutsu.png" }),
        skill("sword_saint_moon", "Moonlit Slash", "5.6× ATK (2.8× + CRIT).", 55, 2.8, 42, { isCrit: true, icon: "/assets/skills/sword_saint_moon.png" }),
    ], { atk: 0.08, crit: 0.14 }),
};
