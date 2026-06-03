# System Plan 31: Negamon V4 — Pokemon Improvement Plan

Last updated: 2026-06-01
Status: **active**
Owner: review before each sprint

## Overview

ระบบ Negamon V4 มีโครงสร้าง server-authoritative ที่ดี แต่ยังมีปัญหาหลายจุดที่ทำให้การต่อสู้ไม่สมจริงและ
ไม่รู้สึกเหมือน Pokémon plan 30 ยืนยันจาก smoke test ว่าสามารถ start/resolve battle ได้ แต่ combat
behavior ยังไม่น่าเชื่อถือพอสำหรับ production

เอกสารนี้รวบรวมปัญหาทั้งหมด จัดลำดับความสำคัญ และกำหนด task ที่ต้องทำในแต่ละ sprint

---

## สถาปัตยกรรมปัจจุบัน (quick reference)

```
src/lib/game-negamon/
├── server/
│   ├── battle-v4.ts              ← orchestrator (startBattle / chooseMove)
│   └── battle-v4-completion.ts   ← reward + progression เมื่อจบ
├── engine-showdown/
│   ├── adapter.ts                ← battle logic ทั้งหมด (damage, AI, choices)
│   ├── mapper.ts                 ← Negamon snapshot → Showdown seed
│   ├── state.ts                  ← NegamonBattleStateV4 types
│   └── target.ts                 ← engine descriptor
└── core/
    ├── monster-snapshot.ts       ← แปลง DB student → battle-ready snapshot
    ├── battle-items.ts           ← item catalog + loadout validation
    ├── monster-growth.ts         ← level 1-60, form bands, stat multipliers
    ├── skill-unlock.ts           ← unlock rules ตาม level/rank
    └── session-v4.ts             ← session types + view factories
```

**API routes:**
- `POST /api/classrooms/[id]/battle/v4/start` → `startNegamonBattleV4()`
- `POST /api/classrooms/[id]/battle/v4/choice` → `chooseNegamonBattleMoveV4()`

**Test command:** `npm run check:negamon-battle`

---

## ปัญหาทั้งหมด (จาก plan 30 + code review)

### 🔴 Blocker — เล่นได้แต่ผิดหรือ reward ไม่ทำงาน

| # | ปัญหา | ไฟล์หลัก | ผลกระทบ |
|---|-------|---------|---------|
| B1 | Species mapping ยืม Pokemon stats ผิดตัว | `mapper.ts:67` | HP/ATK/DEF/SPD ทั้ง battle ผิดหมด |
| B2 | Energy cost = 0 ทุก move | `mapper.ts:createNegamonShowdownMoveSet` | กด strongest move ซ้ำๆ ไม่มี cost |
| B3 | Skill loadout ว่าง → ได้ skill index 0-3 เสมอ | `battle-v4.ts:88-104` | max-level แต่ใช้ได้แค่ skill ต้นๆ |
| B4 | `goldReward: 0` placeholder | `battle-v4.ts:325` | จบ battle ไม่ได้ gold |

### 🟡 Core Feel — เล่นได้แต่ไม่รู้สึกเหมือน Pokémon

| # | ปัญหา | ไฟล์หลัก | ผลกระทบ |
|---|-------|---------|---------|
| C1 | Event log ไม่บอก damage / type effectiveness / crit | `adapter.ts:resolveTurn` | ไม่รู้ว่า turn ทำอะไร |
| C2 | Buff/Debuff/Status ไม่ visible ใน state | `state.ts` | setup moves ไม่มีค่า |
| C3 | AI เลือก move แบบ simple ไม่ challenge | `adapter.ts:scoreChoice` | battle น่าเบื่อ |
| C4 | Stale choiceRequestId → UI ค้าง ไม่ recover | `battle-v4.ts:230` | นักเรียนเห็น "เกมแฮง" |

### 🟢 Polish — ทำทีหลัง

| # | ปัญหา | ไฟล์หลัก | ผลกระทบ |
|---|-------|---------|---------|
| P1 | Progression rework — learnRank ยัง rank-driven | `skill-unlock.ts`, `monster-growth.ts` | skill unlock ไม่ feel |
| P2 | Move pool design — move ยัง "damage button + gimmick" | `negamon-species.ts` | battle ขาด depth |
| P3 | Dead-state recovery อ่อนแอ | `battle-v4.ts`, UI | stuck battle |

---

## Sprint 1 — Fix Blockers

> เป้าหมาย: battle เล่นได้ถูกต้อง stats จริง energy ทำงาน skill loadout ถูก reward ออก
> ทดสอบด้วย QA fixture บน local ก่อน deploy ทุกครั้ง
> คำสั่ง test: `npm run check:negamon-battle`

---

### Task B1 — ใช้ Negamon-native stats แทน Pokemon species mapping

**ปัญหา:**
`createNegamonShowdownTeamSet()` ใน `mapper.ts` ส่ง Pokémon species name (เช่น `"Houndoom"`) ให้ Showdown
engine คำนวณ base stats ซึ่งผิดทั้งหมด เพราะ Negamon มี stat progression ของตัวเองใน `monster-growth.ts`

**สิ่งที่ต้องเปลี่ยน:**

ใน `src/lib/game-negamon/engine-showdown/mapper.ts`:
- `createNegamonBattleCombatantV4FromSeed()` มี `hp`, `maxHp`, `attack`, `defense`, `speed` มาจาก
  `snapshot` อยู่แล้วและถูกต้อง ✅
- `createNegamonShowdownTeamSet()` ที่ส่ง species name เช่น `"Houndoom"` ให้ Showdown ← **ตรงนี้คือปัญหา**

**วิธีแก้:**
ตรวจสอบว่า `createNegamonShowdownTeamSet()` ถูกใช้ใน `adapter.ts` อย่างไร
ถ้า Showdown engine ใช้ `level` + `species` ในการคำนวณ stat → ต้องส่ง stats จาก seed โดยตรง
แทนที่จะยืม species base stats ของ Pokémon

```typescript
// mapper.ts — เปลี่ยนจาก
species: getShowdownSpeciesForNegamonSpeciesId(seed.speciesId), // "Houndoom" ←ผิด

// เป็น — ส่ง stats จาก seed โดยตรง (มีอยู่แล้ว)
// seed.hp, seed.attack, seed.defense, seed.speed คือค่าจาก Negamon progression จริง
```

**ไฟล์ที่ต้องแก้:**
- `src/lib/game-negamon/engine-showdown/mapper.ts` — `createNegamonShowdownTeamSet()`
- `src/lib/game-negamon/engine-showdown/adapter.ts` — ส่วนที่รับ TeamSet และคำนวณ initial HP/stats

**ตรวจสอบ:**
- [ ] สร้าง battle test ระหว่าง pyronox lv.1 vs lv.60 — HP ต้องต่างกันชัดเจน
- [ ] HP ใน battle state ตรงกับ `monster-snapshot.ts` output
- [ ] `scripts/negamon-battle-v4-qa-fixture.mjs` ผ่าน

---

### Task B2 — Fix Energy Cost ส่งผ่านถึง choices

**ปัญหา:**
ทุก move แสดง `energy: 0` ใน valid choices ทั้งที่ `negamon-energy.ts` คำนวณ cost ไว้แล้ว

**Root Cause (สิ่งที่ต้องตรวจสอบ):**
1. `createNegamonShowdownMoveSet()` ใน `mapper.ts` — `energyCost: skill.energyCost` มาจาก `skill` object
2. ตรวจว่า `skill.energyCost` ถูก populate จาก `getNegamonSpeciesSkillCatalog()` หรือเปล่า
3. ถ้า `skill.energyCost` เป็น `undefined` → ต้อง call `getMoveEnergyCost(move, speciesId)` จาก
   `negamon-energy.ts` เพื่อ calculate

```typescript
// mapper.ts — createNegamonShowdownMoveSet
energyCost: skill.energyCost ?? getMoveEnergyCost(skill, snapshot.speciesId),
//          ↑ fallback ถ้าค่าเป็น undefined
```

**ไฟล์ที่ต้องแก้:**
- `src/lib/game-negamon/engine-showdown/mapper.ts` — `createNegamonShowdownMoveSet()`
- `src/lib/game-negamon/core/skills.ts` — ตรวจสอบว่า `energyCost` ถูก export ออกมาหรือเปล่า

**ตรวจสอบ:**
- [ ] Valid choices ทุกตัวมี `cost.energy > 0` (ยกเว้น basic attack)
- [ ] move ที่ระบุ `energyCost` ใน species definition ใช้ค่านั้น
- [ ] เมื่อ energy < cost → choice.enabled = false, reason = "NO_ENERGY"

---

### Task B3 — Auto-build Skill Loadout ถ้าว่างเปล่า

**ปัญหา:**
ใน `battle-v4.ts:88-104` ถ้า `challenger.negamonSkillLoadout` ว่างหรือ null →
`createNegamonMonsterSnapshot()` จะได้ `equippedSkillIds: []` →
`createNegamonShowdownMoveSet(activeSkills)` ได้ `activeSkills = []` →
move set ว่าง → fallback ให้ basic attack เท่านั้น

**วิธีแก้:**
ถ้า `equippedSkillIds` ว่าง → auto-select skills ที่ unlock แล้ว ไม่เกิน `NEGAMON_SKILL_LOADOUT_MAX (4)`

```typescript
// battle-v4.ts — startNegamonBattleV4
const player = createNegamonMonsterSnapshot({
    ...
    equippedSkillIds:
        Array.isArray(challenger.negamonSkillLoadout) && challenger.negamonSkillLoadout.length > 0
            ? (challenger.negamonSkillLoadout as string[])
            : undefined, // undefined → monster-snapshot จะ auto-select
});
```

ตรวจสอบว่า `createNegamonMonsterSnapshot()` ใน `monster-snapshot.ts` handle `undefined` อย่างไร
ถ้ายังไม่ auto-build → เพิ่ม logic: เลือก `unlockedSkills.slice(-4)` (skills ที่ unlock ล่าสุด = tier สูงสุด)

**ไฟล์ที่ต้องแก้:**
- `src/lib/game-negamon/core/monster-snapshot.ts` — auto-select skills ถ้า `equippedSkillIds` empty
- `src/lib/game-negamon/core/skill-unlock.ts` — `validateNegamonSkillLoadout()` fallback behavior

**ตรวจสอบ:**
- [ ] student ที่ไม่เคย set loadout → ได้ 4 skills ที่ unlock แล้วตาม level
- [ ] max-level student → ได้ skills tier สูงสุด ไม่ใช่ skill index 0-3
- [ ] basic attack ถูกรวมเสมอ (skill-unlock.ts มี `isNegamonBasicAttackMoveId` check)

---

### Task B4 — Implement Gold Reward ใน finalizeNegamonBattleV4Completion

**ปัญหา:**
`battle-v4.ts:325` set `goldReward: 0` เป็น placeholder ก่อนส่งไป `finalizeNegamonBattleV4Completion()`

**สิ่งที่มีอยู่แล้ว:**
`battle-v4-completion.ts` import `calculateNegamonBattleGoldReward` และ `createNegamonBattleRewardFinalizationPlan`
จาก `core/battle-rewards.ts` อยู่แล้ว — ตรวจสอบว่าถูก call จริงหรือเปล่า

**วิธีแก้:**
1. ตรวจสอบ `finalizeNegamonBattleV4Completion()` ว่า gold reward ถูก calculate และ write ลง
   `EconomyTransaction` ด้วย `idempotencyKey` จริงหรือยัง
2. ตรวจสอบ `battle-v4.ts` ว่า `finalGoldReward` ถูก set ก่อน update session หรือเปล่า

**ไฟล์ที่ต้องแก้:**
- `src/lib/game-negamon/server/battle-v4-completion.ts` — เปิด gold reward path
- `src/lib/game-negamon/core/battle-rewards.ts` — ตรวจสอบ `calculateNegamonBattleGoldReward()`

**ตรวจสอบ:**
- [ ] ผู้ชนะได้รับ gold > 0 หลัง battle จบ
- [ ] `EconomyTransaction` ถูกสร้างพร้อม idempotencyKey
- [ ] play battle ซ้ำ 2 ครั้ง → gold ได้แค่ครั้งเดียว (idempotency ทำงาน)

---

## Sprint 2 — Core Feel

> เป้าหมาย: battle รู้สึกเหมือน Pokémon — เห็นตัวเลข เห็น status เห็น buff/debuff
> เริ่มหลังจาก Sprint 1 ผ่าน QA ทั้งหมด

---

### Task C1 — Event Log แสดง damage detail

**ต้องการ:**
แต่ละ turn event ต้องบอก:
- damage ที่ทำได้ (ตัวเลข)
- type effectiveness: `super_effective` / `not_very_effective` / `immune` / `normal`
- critical hit: true/false
- source move name
- HP ก่อน/หลัง

```typescript
// state.ts — NegamonBattleEventV4 ควรมี field เหล่านี้
type NegamonBattleDamageEventV4 = {
    kind: "damage";
    targetSide: NegamonBattleSideV4;
    moveId: string;
    moveName: string;
    damage: number;
    effectiveness: "super_effective" | "not_very_effective" | "immune" | "normal";
    isCrit: boolean;
    hpBefore: number;
    hpAfter: number;
}
```

**ไฟล์ที่ต้องแก้:**
- `src/lib/game-negamon/engine-showdown/state.ts` — เพิ่ม event types
- `src/lib/game-negamon/engine-showdown/adapter.ts` — `resolveTurn()` emit events พร้อมข้อมูล

---

### Task C2 — Stat Stage / Status visible ใน State

**ต้องการ:**
`NegamonBattleCombatantV4` ต้องแสดง:
- `statStages`: `{ attack: +1, defense: 0, speed: -1, ... }` เหมือน Pokémon ±6
- `activeStatusIds`: `["BURN", "PARALYZE"]`
- event เมื่อ stat เปลี่ยน / status ถูก apply

**ไฟล์ที่ต้องแก้:**
- `src/lib/game-negamon/engine-showdown/state.ts` — เพิ่ม `statStages` ใน combatant
- `src/lib/game-negamon/engine-showdown/adapter.ts` — update stat stages เมื่อ buff/debuff move ใช้

---

### Task C3 — ปรับ AI Scoring ให้ฉลาดขึ้น

**ปัจจุบัน:**
`scoreChoice()` ใน `adapter.ts` มี 6 criteria แต่อาจ weight ไม่ถูก

**ต้องการ:**
- AI ใช้ setup move เมื่อ HP เยอะ
- AI ใช้ healing item เมื่อ HP < 30%
- AI ใช้ lethal move ถ้าสามารถ KO ได้
- AI ไม่ spam move เดิม (ใช้ cooldown timing)

**ไฟล์ที่ต้องแก้:**
- `src/lib/game-negamon/engine-showdown/adapter.ts` — `scoreChoice()` + weight tuning

---

### Task C4 — UI Recovery เมื่อ choiceRequestId Stale

**ปัจจุบัน:**
เมื่อ server reject `STALE_CHOICE` → UI ได้รับ new state + new choiceRequestId แต่ไม่ได้ auto-update

**ต้องการ:**
- Response `STALE_CHOICE` ต้องส่ง `state` + `validChoices` + `choiceRequestId` ใหม่ (มีอยู่แล้วใน code)
- UI ต้องรับ response นี้แล้ว update state โดยไม่ต้องโหลดหน้าใหม่

**ไฟล์ที่ต้องแก้:**
- `src/lib/game-negamon/server/battle-v4.ts` — ตรวจว่า STALE_CHOICE response ครบข้อมูล
- `src/components/negamon/NegamonBattleArenaV4.tsx` — handle STALE_CHOICE response

---

## Sprint 3 — Polish

> ทำหลังจาก Sprint 1-2 ผ่าน production QA

---

### Task P1 — Progression Rework

**ปัจจุบัน:**
`skill-unlock.ts` ใช้ `rankIndex` เป็นหลักในการ unlock skills

**ต้องการ:**
Skill unlock ตาม `level` (1-60) ไม่ใช่ rank (0-5)
- Level 1-7: basic attack + 1 skill
- Level 8-15: +1 skill ต่อ form
- Level 50-60: final form skills รวม ultimate

**ไฟล์ที่ต้องแก้:**
- `src/lib/game-negamon/core/skill-unlock.ts`
- `src/lib/negamon-species.ts` — `learnRank` → `learnLevel`

---

### Task P2 — Move Pool Redesign

**ต้องการ:**
แต่ละ species มี move ที่มี **identity ชัดเจน**:
- 1 fast/priority move
- 1-2 core damage moves (ตาม type)
- 1 setup/utility move
- 1 ultimate move (high cost, high reward)

**Reference:** plan 29 + Pokemon Showdown move data patterns

**ไฟล์ที่ต้องแก้:**
- `src/lib/negamon-species.ts` — redesign moves ต่อ species
- `src/lib/game-negamon/core/skills.ts` — เพิ่ม move definitions

---

### Task P3 — Dead-State Recovery

**ต้องการ:**
ถ้า battle ค้าง (stale state, no choices) → auto-resolve เป็น timeout win/loss แทนที่จะ freeze

**ไฟล์ที่ต้องแก้:**
- `src/lib/game-negamon/server/battle-v4.ts` — timeout detection
- `src/lib/game-negamon/server/battle-v4-completion.ts` — handle `finishReason: "timeout"`

---

## Baseline Commands

รันก่อนและหลังแก้ทุก task:

```bash
npm run check:negamon-battle         # engine, rewards, balance, tuning
npm run check:negamon-reward-audit   # audit, remediation, resync
npx tsc --noEmit                     # type-check
npm run check:i18n                   # ตรวจ hardcoded strings

# QA fixture (local เท่านั้น)
node scripts/negamon-battle-v4-qa-fixture.mjs
```

---

## Do NOT deploy until

- [ ] Sprint 1 tasks ทั้ง 4 ผ่าน QA fixture บน local
- [ ] `npm run check:negamon-battle` ผ่าน green ทั้งหมด
- [ ] `npx tsc --noEmit` ไม่มี error
- [ ] Owner review และ approve

---

## Related Documents

- `docs/system-plans/30-negamon-battle-v4-correctness-and-qa.md` — smoke test + confirmed problems (source)
- `docs/system-plans/29-negamon-pokemon-inspired-skill-redesign.md` — move pool design guide
- `docs/system-plans/28-negamon-level-form-skill-progression-rework.md` — progression model
- `docs/system-plans/26-negamon-pokemon-inspired-system-rebuild.md` — architecture rebuild plan
- `docs/negamon-battle-phase-3-server-authority.md` — server-authority pattern
- `docs/GLOSSARY.md` — Negamon, Battle, Gold, Energy, PP, Stat Stage
- `.agents/skills/negamon-expert/SKILL.md` — AI skill สำหรับงาน Negamon
