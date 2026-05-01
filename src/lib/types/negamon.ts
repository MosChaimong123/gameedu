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
    | "BURN"          // เสีย 3% HP ต่อตา (3 ตา)
    | "PARALYZE"      // 50% โอกาสข้ามตา (2 ตา)
    | "SLEEP"         // ข้ามตา (1-2 ตา)
    | "POISON"        // เสีย 1.25% HP ต่อตา (ตลอดเกม)
    | "BADLY_POISON"  // เสีย +0.8% HP ต่อตา สะสมจนถึง 8%
    | "FREEZE"        // ข้ามตา, 20%/ตา ละลายเอง
    | "CONFUSE"       // 33% โอกาสตีตัวเอง (3 ตา)
    | "BOOST_ATK"     // ATK +25% (2 ตา)
    | "BOOST_DEF"     // DEF +25% (2 ตา)
    | "BOOST_SPD"     // SPD +25% (2 ตา)
    | "BOOST_WATER_DMG" // Water move +35% (2 ตา)
    | "LOWER_ATK"     // ลด ATK opponent -15%
    | "LOWER_ATK_ALL" // ลด ATK ทุกคน -15% (AoE)
    | "LOWER_DEF"     // ลด DEF opponent -15%
    | "HEAL_25"       // ฟื้น HP 20%
    | "IGNORE_DEF";   // ไม่คิด DEF ของ opponent

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
    energyCost?: number; // energy used per cast (resolved by engine/UI when omitted)
};

export type MonsterForm = {
    rank: number;   // 0-5 ตรงกับ Common→Mythic index
    name: string;   // ชื่อ form เช่น "Nakat", "Phaya Nak"
    icon: string;   // emoji หรือ image path
    color: string;  // hex color สำหรับ UI
};

export type PassiveAbilityId =
    | "acid_rain"       // นาค: POISON ติดไม่หาย (-1 turns ตลอดเกม)
    | "flame_body"      // ครุฑ: 10% โดนตี → ผู้โจมตีติด BURN
    | "iron_shell"      // สิงห์: รับ dmg -10% ถาวร
    | "tailwind"        // กินรี: SPD ×1.1 ตลอดเกม
    | "rage_mode"       // ทศกัณฑ์: HP < 50% → ATK ×1.25 (ครั้งเดียว)
    | "aerial_strike"   // หนุมาน: Priority move +20% dmg
    | "static"          // เมขลา: 15% โดนตี → ผู้โจมตีติด PARALYZE
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
