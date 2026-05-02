// ============================================================
// Negamon Classroom RPG — Type Definitions
// ============================================================

export type MonsterType =
    | "NORMAL" // ไร้ธาตุ — ใช้ท่าตีธรรมดาที่ฝังจากระบบเท่านั้น (ไม่ใช้เป็นธาตุมอน)
    | "FIRE"
    | "WATER"
    | "EARTH"
    | "WIND"
    | "THUNDER"
    | "LIGHT"
    | "DARK";

export type MoveCategory = "PHYSICAL" | "SPECIAL" | "STATUS" | "HEAL";

export type StatusEffect =
    | "BURN"          // ปลายเทิร์น: เสีย 3% max HP (min 1) × 3 เทิร์น
    | "PARALYZE"      // 50% โอกาสข้ามตา (2 ตา)
    | "SLEEP"         // ข้ามตา (1-2 ตา)
    | "POISON"        // เสีย 1.25% HP ต่อตา (ตลอดเกม)
    | "BADLY_POISON"  // เสีย 4% max HP ต่อทิกปลายเทิร์น (คงที่)
    | "FREEZE"        // ข้ามตา, 20%/ตา ละลายเอง
    | "CONFUSE"       // 33% โอกาสตีตัวเอง (3 ตา)
    | "BOOST_ATK"     // ATK +25% (2 ตา)
    | "BOOST_DEF"     // DEF +25% (2 ตา)
    | "BOOST_DEF_20"  // DEF +20% (2 ตา)
    | "BOOST_SPD"     // SPD +25% (2 ตา)
    | "BOOST_SPD_30"  // SPD +30% (2 ตา)
    | "BOOST_SPD_100" // SPD ×2 (+100%) (ตามเทิร์นใน engine)
    | "BOOST_WATER_DMG" // Water move +35% (2 ตา)
    | "LOWER_ATK"     // ลด ATK opponent -15%
    | "LOWER_ATK_ALL" // ลด ATK ทุกคน -15% (AoE)
    | "LOWER_DEF"     // ลด DEF opponent -15%
    | "LOWER_SPD"     // ลด SPD opponent 50% (×0.5)
    | "LOWER_EN_REGEN" // ลด EN ที่ฟื้นต่อปลายเทิร์นของฝ่ายตรงข้าม (ค่าใน effectRegenPenalty)
    | "HEAL_25"       // ฟื้น HP 20%
    | "IGNORE_DEF";   // debuff ฝั่งถูกโจมตี: DEF ถูกคิดลดช่วงรับดาเมจ (ตามเทิร์นที่ตั้งใน engine)

export type MonsterBaseStats = {
    hp: number;
    atk: number;
    def: number;
    spd: number;
};

export type MonsterStats = MonsterBaseStats; // computed stats (same shape)

export type MonsterMove = {
    id: string;
    name: string;
    type: MonsterType;
    category: MoveCategory;
    power: number;       // 0 = status/heal move
    accuracy: number;    // 0-100
    learnRank: number;   // สกิลใน species: 3–6 (ปลดเมื่อ rankIndex+1 >= learnRank); ท่าตีธรรมดา inject แยก
    priority?: number;   // turn-order priority: +1 ไปก่อน, -1 ไปหลัง (default 0)
    critBonus?: number;  // เพิ่ม crit rate เป็น % เช่น 20 = +20%
    effect?: StatusEffect;
    effectChance?: number; // % โอกาสเกิด effect (default 100 ถ้าไม่ระบุ)
    /** ระยะเอฟเฟกต์ (เทิร์นที่ตั้งใน addEffect) — ใช้เมื่อต่างจากค่า default ของ engine เช่น PARALYZE 1 เทิร์น */
    effectDurationTurns?: number;
    /** เอฟเฟกต์บนตัวผู้ใช้ท่า (เช่น บัฟขณะที่ effect หลักโจมตีศัตรู) */
    selfEffect?: StatusEffect;
    /** ระยะเวลา selfEffect (เทิร์น) */
    selfEffectDurationTurns?: number;
    /** PARALYZE: true = ข้ามเทิร์นทุกครั้งขณะติด (ไม่ทอย 50%) */
    effectParalyzeFullSkip?: boolean;
    /** BURN: ดาเมจต่อ tick = floor(maxHp × ค่านี้) เช่น 0.04 = 4% — ไม่ใส่ใช้ default ของ engine */
    effectBurnDotRate?: number;
    /** LOWER_EN_REGEN: ลด EN ที่ฟื้นต่อปลายเทิร์นของศัตรู (default 15) */
    effectRegenPenalty?: number;
    /** IGNORE_DEF: ตัวคูณ DEF ที่ใช้รับดาเมจ (default 0.5 ใน engine) — เช่น 0.75 = คง 75% ของ DEF (= เจาะ 25%) */
    effectIgnoreDefRetained?: number;
    /** ฟื้น HP หลังตี = floor(damage * drainPct / 100) */
    drainPct?: number;
    energyCost?: number; // energy used per cast (resolved by engine/UI when omitted)
};

export type MonsterForm = {
    rank: number;   // 0-5 ตรงกับ Common→Mythic index
    name: string;   // ชื่อ form เช่น "Nakat", "Phaya Nak"
    icon: string;   // emoji หรือ image path
    color: string;  // hex color สำหรับ UI
};

export type PassiveAbilityId =
    | "acid_rain"       // นาค: ฝ่ายตรงข้ามติดพิษ → ดาเมจพิษ +2% max HP ต่อทิก (สะสม)
    | "flame_body"      // ครุฑ: เมื่อ HP < 50% ดาเมจไหม้ที่ศัตรูรับ +7% ของ max HP ต่อ tick
    | "iron_shell"      // สิงห์: DEF stage ×1.1 ตั้งแต่เริ่มต่อสู้
    | "tailwind"        // กินรี: SPD ×1.1 ตลอดเกม
    | "rage_mode"       // ทศกัณฑ์: HP < 50% → ATK ×1.25 (ครั้งเดียว)
    | "aerial_strike"   // หนุมาน: +20% crit rate on damaging moves
    | "volt_flow"       // เมขลา: ฟื้น EN เพิ่ม +15 ทุกปลายเทิร์น
    | "guardian_scale"; // สุพรรณมัจฉา: HP < 30% → Heal 15% ครั้งเดียว

export type PassiveAbility = {
    id: PassiveAbilityId;
    name: string;   // ชื่อภาษาไทย
    desc: string;   // คำอธิบายสั้น
};

export type MonsterSpecies = {
    id: string;            // unique key เช่น "naga", "garuda"
    name: string;          // ชื่อไทย เช่น "พญานาค"
    type: MonsterType;     // primary type
    type2?: MonsterType;   // secondary type — ค่าเริ่มต้นทุกสายพันธุ์ใน catalog มีครบคู่กับ type
    baseStats: MonsterBaseStats;
    forms: MonsterForm[];  // ต้องมีครบ 6 forms (index 0-5)
    moves: MonsterMove[];
    ability?: PassiveAbility;
};

// เก็บใน Classroom.gamifiedSettings.negamon
export type NegamonSettings = {
    enabled: boolean;
    allowStudentChoice: boolean;  // ให้นักเรียนเลือก species เองได้ไหม
    expPerPoint: number;          // EXP ต่อ 1 แต้ม (default: 10)
    expPerAttendance: number;     // EXP เมื่อเข้าเรียน (default: 20)
    species: MonsterSpecies[];    // species ที่อนุญาตในห้องนี้
    studentMonsters: Record<string, string>; // studentId → speciesId
    disabledMoves?: string[];     // move IDs ที่ครูปิดไว้ (ไม่แสดงในห้อง)
};

// computed stats ของ monster นักเรียนคนนึง (ใช้ใน UI และ Battle)
export type StudentMonsterState = {
    speciesId: string;
    speciesName: string;
    type: MonsterType;
    type2?: MonsterType;
    form: MonsterForm;
    stats: MonsterStats;
    unlockedMoves: MonsterMove[];
    rankIndex: number; // 0-5
    ability?: PassiveAbility;
};

// ผลลัพธ์ของ damage calculation
export type DamageResult = {
    damage: number;
    typeMultiplier: number;   // 0.5, 1.0, 2.0
    effectiveness: "super" | "normal" | "weak"; // สำหรับแสดงข้อความ
    isFast: boolean;          // ตอบถูกเร็ว → bonus damage
};

// Battle move ที่ player เลือก (ใช้ใน Battle Engine)
export type SelectedAction = {
    playerId: string;      // socket id
    moveId: string;
    targetId?: string;     // socket id ของเป้าหมาย (null = self หรือ AoE)
    isFast: boolean;       // ตอบถูกใน 5 วิแรก
};
