# Negamon V4 — Work Plan

Last updated: 2026-06-01
Status: **active**
Ref: [31-negamon-v4-pokemon-improvement-plan.md](./31-negamon-v4-pokemon-improvement-plan.md)

---

## ภาพรวมงาน

```
Sprint 1 — Fix Blockers     (4 tasks, ~4-6 วัน)
Sprint 2 — Core Feel        (4 tasks, ~5-7 วัน)
Sprint 3 — Polish           (3 tasks, ~5-7 วัน)
```

**กฎเหล็ก:**
- ต้อง `npm run check:negamon-battle` ผ่าน ก่อนและหลังทุก task
- ต้อง `npx tsc --noEmit` ผ่าน ก่อน push ทุกครั้ง
- ห้าม deploy จนกว่า Sprint 1 ผ่าน QA fixture บน local

---

## Sprint 1 — Fix Blockers

> เป้าหมาย: battle เล่นได้ถูกต้อง — stats จริง, energy ทำงาน, skills ถูก, reward ออก

---

### Task B1 — Fix Species Stats

**ปัญหาจริง:**
`createBattle()` ใน `adapter.ts` เรียก `createNegamonShowdownTeamSet(playerSeed)` แล้วส่ง
Pokémon species name (เช่น `"Houndoom"`) ให้ Showdown runtime คำนวณ base stats
แทนที่จะใช้ HP/ATK/DEF/SPD จาก Negamon progression ที่อยู่ใน `playerSeed` อยู่แล้ว

**ค้นพบ:** `createNegamonBattleCombatantV4FromSeed(seed)` ใช้ stats จาก `seed` ถูกต้อง ✅
แต่ `createNegamonShowdownTeamSet(seed)` ส่ง species name ที่ผิดให้ Showdown → Showdown
อาจ override HP ด้วย base stats ของ Pokémon นั้น

**ไฟล์:** `src/lib/game-negamon/engine-showdown/adapter.ts`, `mapper.ts`

#### Step-by-step

**Step 1 — ตรวจสอบ Showdown runtime ใช้ species stats อย่างไร**
```bash
# อ่านไฟล์ที่ loadShowdownRuntime() ถูก import
# หา: Showdown ใช้ level + species → stat ไหม หรือรับ explicit stats ได้
```
หากพบว่า Showdown คำนวณ HP จาก species base stats → ต้อง override ด้วย seed stats

**Step 2 — ถ้าต้อง override: แก้ `createNegamonShowdownTeamSet()`**
```typescript
// mapper.ts — แทนที่ species name ด้วยข้อมูลที่ force Showdown ใช้ stats จาก seed
// หรือ override HP หลัง Showdown init ด้วย seed.hp, seed.maxHp
```

**Step 3 — ตรวจสอบ `createNegamonBattleCombatantV4FromSeed()` ว่า hp ตรงกับ seed**
```typescript
// combatant.hp === seed.hp === itemRuntime.stats.maxHp ← ต้องตรง
```

**Step 4 — QA**
```bash
# สร้าง battle: student lv.1 vs student lv.60 → HP ต้องต่างกันชัดเจน
node scripts/negamon-battle-v4-qa-fixture.mjs
npm run check:negamon-battle
```

**เกณฑ์ผ่าน:**
- [ ] HP ใน battle state ตรงกับ `monster-snapshot.ts` output
- [ ] lv.1 vs lv.60 มี HP ต่างกันตาม `NEGAMON_STAT_GROWTH_MULTIPLIERS`
- [ ] `npm run check:negamon-battle` ผ่าน

---

### Task B2 — Fix Energy Cost

**ปัญหาจริง (จาก code review):**
`skills.ts` มี `getMoveEnergyCost()` และส่ง `energyCost` ออกมา
`mapper.ts:createNegamonShowdownMoveSet()` ใช้ `skill.energyCost` ตรงๆ
**แต่** `skills.slice(0, 4)` ← อาจ slice skills ที่ยังไม่มี `energyCost` ถูกต้อง

ต้องตรวจว่า `skill.energyCost` ถูก populate ก่อน mapper ใช้หรือเปล่า

**ไฟล์:** `src/lib/game-negamon/core/skills.ts`, `mapper.ts`

#### Step-by-step

**Step 1 — เพิ่ม test case ตรวจ energyCost**
```typescript
// negamon-battle-engine.test.ts หรือ showdown-adapter.test.ts
// ตรวจว่า validChoices ทุกตัว (ยกเว้น basic attack) มี cost.energy > 0
```

**Step 2 — Trace `skill.energyCost` ตั้งแต่ต้นทาง**
```bash
# ตรวจสอบ getNegamonSpeciesSkillCatalog() → skills.ts
# ตรวจสอบว่า MonsterMove.energyCost ถูก set ก่อน createNegamonSkillDefinition()
```

**Step 3 — ถ้า energyCost undefined: เพิ่ม fallback ใน mapper**
```typescript
// mapper.ts:createNegamonShowdownMoveSet
energyCost: skill.energyCost ?? getMoveEnergyCost(skill, snapshot.speciesId),
```

**Step 4 — ตรวจ createChoiceForMove() ใน adapter**
```typescript
// adapter.ts — ตรวจว่า energyCost ถูกส่งจาก seed.moveSet ไปถึง choice.cost.energy
const hasEnergy = availableEnergy >= input.move.energyCost; // บรรทัดนี้ต้องทำงาน
```

**Step 5 — QA**
```bash
npm run check:negamon-battle
# ตรวจ response จาก POST /battle/v4/start → validChoices[].cost.energy > 0
```

**เกณฑ์ผ่าน:**
- [ ] `validChoices` ทุกตัวมี `cost.energy > 0` (ยกเว้น basic attack = 0)
- [ ] move ที่ `energyCost` สูง → disabled เมื่อ energy ไม่พอ
- [ ] `choice.reason === "NO_ENERGY"` เมื่อ energy ไม่พอ

---

### Task B3 — Fix Skill Loadout Auto-Build

**ปัญหาจริง (จาก code review):**
- `monster-snapshot.ts` มี `fallbackToFirstSkills: !input.equippedSkillIds || input.equippedSkillIds.length === 0` อยู่แล้ว ✅
- `skill-unlock.ts:validateNegamonSkillLoadout()` มี `fallbackToFirstSkills` แล้ว ✅
- **แต่** `mapper.ts:createNegamonShowdownMoveSet()` ใช้ `skills.slice(0, 4)` ← take แค่ 4 ตัวแรก
  ซึ่งสำหรับ max-level student คือ skills เก่าที่สุด ไม่ใช่ดีที่สุด

**ไฟล์:** `mapper.ts`, `skill-unlock.ts`

#### Step-by-step

**Step 1 — แก้ `createNegamonShowdownMoveSet()` ใช้ skills ที่ดีที่สุด**
```typescript
// mapper.ts — แทนที่ skills.slice(0, 4)
// เรียง skills ตาม unlock level (สูงสุดก่อน) แล้วค่อย slice(0, 4)
// หรือใช้ equippedSkillIds จาก snapshot โดยตรง
```

**Step 2 — แก้ `validateNegamonSkillLoadout()` fallback behavior**
```typescript
// skill-unlock.ts — fallback ควรเลือก skills tier สูงสุดไม่เกิน 4 ตัว
// แทนที่ firstSkills (index 0-3) → sortedByUnlockLevel.slice(-4)
```

**Step 3 — แก้ `battle-v4.ts:88` — ส่ง equippedSkillIds ถูกต้อง**
```typescript
// battle-v4.ts
equippedSkillIds:
    Array.isArray(challenger.negamonSkillLoadout) && challenger.negamonSkillLoadout.length > 0
        ? (challenger.negamonSkillLoadout as string[])
        : undefined // undefined → monster-snapshot จะ auto-build ✅
```

**Step 4 — QA**
```bash
# ทดสอบกับ student ที่ไม่เคย set loadout
# ทดสอบกับ max-level student → ต้องได้ high-tier skills
npm run check:negamon-battle
```

**เกณฑ์ผ่าน:**
- [ ] student ที่ไม่เคย set loadout → ได้ 4 skills ที่ level สูงสุด
- [ ] max-level student → ได้ ultimate/finisher skills ไม่ใช่ skill index 0-3
- [ ] basic attack ถูกรวมเสมอ

---

### Task B4 — Fix Gold Reward

**ปัญหาจริง (จาก code review):**
`battle-v4-completion.ts` มี `calculateNegamonBattleGoldReward()` และ `resolveBattleRewardPayout()` ครบ ✅
**แต่** `battle-v4.ts:325` set `goldReward: 0` เป็น `nextResult` เริ่มต้น
แล้ว transaction อาจไม่ได้ update `nextResult.goldReward` จาก `completion.result`

**ไฟล์:** `src/lib/game-negamon/server/battle-v4.ts`

#### Step-by-step

**Step 1 — ตรวจสอบ transaction block ใน `chooseNegamonBattleMoveV4()`**
```typescript
// battle-v4.ts:329-397 — ตรวจว่า completion.result.goldReward
// ถูก merge เข้า nextResult อย่างถูกต้อง
nextResult = {
    ...nextResult,
    ...completion.result, // ← goldReward ต้องอยู่ใน completion.result
};
finalGoldReward = completion.result.goldReward ?? 0;
```

**Step 2 — ตรวจสอบ `finalizeNegamonBattleV4Completion()` return value**
```typescript
// battle-v4-completion.ts — ตรวจว่า return object มี goldReward จริง
// payout.goldReward ต้องถูก include ใน participantResults
```

**Step 3 — ตรวจสอบ `recordEconomyTransaction()` ถูก call**
```typescript
// battle-v4-completion.ts — ตรวจว่า EconomyTransaction ถูกสร้างพร้อม idempotencyKey
```

**Step 4 — QA**
```bash
# play battle จนจบ → check student.gold เพิ่มขึ้น
# play battle ซ้ำ 2 ครั้ง → gold เพิ่มแค่ครั้งเดียว (idempotency)
npm run check:economy-shop-ledger
npm run check:negamon-battle
```

**เกณฑ์ผ่าน:**
- [ ] ผู้ชนะได้ gold > 0 หลัง battle จบ
- [ ] `EconomyTransaction` ถูกสร้างพร้อม idempotencyKey
- [ ] Battle เดิมเล่นซ้ำ → gold ไม่เพิ่มซ้ำ

---

## Sprint 2 — Core Feel

> เริ่มหลัง Sprint 1 ผ่าน QA ทั้งหมด

---

### Task C1 — Event Log แสดง Damage Detail

**เป้าหมาย:** นักเรียนเห็น "โจมตีด้วย Ember Fang — 47 damage (super effective!) — HP เหลือ 132/250"

**ไฟล์:** `src/lib/game-negamon/engine-showdown/state.ts`, `adapter.ts`

#### Step-by-step

**Step 1 — เพิ่ม event types ใน `state.ts`**
```typescript
type NegamonBattleDamageEventV4 = {
    kind: "damage";
    actorSide: NegamonBattleSideV4;
    targetSide: NegamonBattleSideV4;
    moveId: string;
    moveName: string;
    damage: number;
    effectiveness: "super_effective" | "not_very_effective" | "immune" | "normal";
    isCrit: boolean;
    hpBefore: number;
    hpAfter: number;
};
type NegamonBattleStatStageEventV4 = {
    kind: "stat_stage";
    targetSide: NegamonBattleSideV4;
    stat: string;
    delta: number;
    newStage: number;
};
type NegamonBattleStatusEventV4 = {
    kind: "status_applied" | "status_removed";
    targetSide: NegamonBattleSideV4;
    statusId: string;
};
```

**Step 2 — `resolveTurn()` ใน `adapter.ts` emit events พร้อมข้อมูล**
- เมื่อ damage เกิด → push `NegamonBattleDamageEventV4`
- เมื่อ stat stage เปลี่ยน → push `NegamonBattleStatStageEventV4`
- เมื่อ status apply → push `NegamonBattleStatusEventV4`

**Step 3 — UI อ่าน events แสดงผล**
- แก้ `NegamonBattleArenaV4.tsx` — แสดง event log เป็น animation sequence
- เช่น "🔥 Ember Fang → 47 (2x!)" → แสดง HP bar animate

**เกณฑ์ผ่าน:**
- [ ] แต่ละ turn มี event log ครบ: move name, damage, effectiveness, HP ก่อน/หลัง
- [ ] crit hit แสดง indicator พิเศษ
- [ ] status move แสดง "Paralyzed!"

---

### Task C2 — Stat Stage / Status Visible ใน State

**เป้าหมาย:** นักเรียนเห็น buff/debuff icons บน monster sprite เหมือน Pokémon

**ไฟล์:** `src/lib/game-negamon/engine-showdown/state.ts`, `adapter.ts`

#### Step-by-step

**Step 1 — เพิ่ม `statStages` ใน `NegamonBattleCombatantV4`**
```typescript
// state.ts
statStages: {
    attack: number;    // -6 ถึง +6
    defense: number;
    speed: number;
    specialAttack?: number;
    specialDefense?: number;
};
activeStatusIds: string[]; // ["BURN", "PARALYZE"]
```

**Step 2 — `resolveTurn()` อัป `statStages` เมื่อ buff/debuff move ใช้**
- ค่าเปลี่ยน → emit `stat_stage` event + อัป `combatant.statStages`

**Step 3 — damage formula ใช้ `statStages` จริง**
- ตรวจว่า `calculateFormulaDamage()` ใน `core/rules/` รับ stat stages ไหม
- ถ้ายังไม่รับ → ส่ง modified ATK/DEF หลังจาก apply stages

**Step 4 — UI แสดง stat stage icons**
- ↑↑ เหนือ ATK bar = +2 stages
- ↓ เหนือ DEF bar = -1 stage
- Status badge: 🔥 BURN, ⚡ PARALYZ, 💤 SLEEP

**เกณฑ์ผ่าน:**
- [ ] Swords Dance → `statStages.attack = +2`
- [ ] Burn status → `activeStatusIds = ["BURN"]` + damage ลดลง 12.5% ต่อ turn
- [ ] UI แสดง indicators ถูกต้อง

---

### Task C3 — ปรับ AI ให้ฉลาดขึ้น

**เป้าหมาย:** AI ที่ทำให้การต่อสู้ท้าทาย — ใช้ heal ตรงเวลา setup เมื่อ HP เยอะ lethal เมื่อจะ KO ได้

**ไฟล์:** `src/lib/game-negamon/engine-showdown/adapter.ts`

#### Step-by-step

**Step 1 — ตรวจ `scoreChoice()` ปัจจุบัน**
```typescript
// adapter.ts — ดู breakdown weights ปัจจุบัน
// lethalDamage, damage, survival, energyEfficiency, statusValue, setupValue, cooldownTiming
```

**Step 2 — ปรับ weight ตาม HP threshold**
```typescript
// ถ้า opponent HP < 30% → lethalDamage weight * 3
// ถ้า self HP < 25% → survival weight * 2 (heal item สำคัญ)
// ถ้า self HP > 70% → setupValue weight * 1.5 (setup ได้เลย)
// ถ้า opponent HP > 80% → ไม่ rush lethal → damage + setup
```

**Step 3 — เพิ่ม AI type-awareness**
```typescript
// ถ้า self มี super-effective move ต่อ opponent type → prioritize นั้น
// ใช้ type chart จาก core/rules/
```

**Step 4 — ทดสอบ AI**
```bash
# สร้าง AI vs AI battle 10 ครั้ง ดู distribution ของ winner
# AI ไม่ควร spam move เดิมทุก turn
npm run check:negamon-battle
```

**เกณฑ์ผ่าน:**
- [ ] AI ใช้ heal item เมื่อ HP < 25%
- [ ] AI ใช้ setup move ใน 3 turn แรกเมื่อ HP เยอะ
- [ ] AI ใช้ lethal move เมื่อสามารถ KO opponent ได้
- [ ] Battle ไม่จบใน < 3 turns เว้นแต่ level ต่างกันมาก

---

### Task C4 — UI Recovery เมื่อ choiceRequestId Stale

**เป้าหมาย:** นักเรียนเล่นต่อได้ทันทีหลัง "stale request" โดยไม่ต้อง reload

**ไฟล์:** `src/lib/game-negamon/server/battle-v4.ts`, `NegamonBattleArenaV4.tsx`

#### Step-by-step

**Step 1 — ตรวจ STALE_CHOICE response มีข้อมูลครบ**
```typescript
// battle-v4.ts:231-242 — response ต้องมี
return { ok: false, status: 409, body: {
    error: "STALE_CHOICE",
    choiceRequestId: parsed.choiceRequestId, // ← new ID
    state: parsed.state,                      // ← current state
    validChoices: parsed.state.choices.player, // ← new choices
}};
```

**Step 2 — UI handle STALE_CHOICE**
```typescript
// NegamonBattleArenaV4.tsx
if (response.error === "STALE_CHOICE") {
    // อัป state + choiceRequestId ใหม่โดยไม่ reload
    setState(response.state);
    setChoiceRequestId(response.choiceRequestId);
    setValidChoices(response.validChoices);
    // แสดง toast: "กรุณาลองอีกครั้ง"
}
```

**Step 3 — เพิ่ม retry logic**
- ถ้า STALE 2 ครั้งติดกัน → reload state จาก server (GET session)
- ถ้า STALE 5 ครั้ง → แสดง "Battle state lost — please refresh"

**เกณฑ์ผ่าน:**
- [ ] STALE_CHOICE → UI อัปเองโดยไม่ reload หน้า
- [ ] นักเรียนเห็น choices ใหม่ทันที
- [ ] ไม่มีการ "freeze" นานกว่า 3 วินาที

---

## Sprint 3 — Polish

> ทำหลังจาก Sprint 2 ผ่าน QA และได้รับ feedback จากการเล่นจริง

---

### Task P1 — Progression Rework (Level-driven Skill Unlock)

**เป้าหมาย:** skill unlock รู้สึกเหมือน leveling ใน Pokémon — ได้ skill ใหม่ทุก 5-8 levels

**ไฟล์:** `src/lib/game-negamon/core/skill-unlock.ts`, `src/lib/negamon-species.ts`

**Approach:**
1. เพิ่ม `learnLevel` ใน `MonsterMove` (ปัจจุบันใช้ `learnRank`)
2. Map `learnRank` เป็น `learnLevel` ตาม `NEGAMON_FORM_LEVEL_BANDS`
3. อัป `getUnlockedNegamonSkillDefinitions()` ใช้ `learnLevel`

**เกณฑ์ผ่าน:**
- [ ] lv.1: basic + 1 starter skill
- [ ] lv.8,16,26,38,50: unlock skill ใหม่ 1 ตัว
- [ ] lv.50+: access ultimate move

---

### Task P2 — Move Pool Redesign

**เป้าหมาย:** แต่ละ species มี move identity ชัดเจน — burst/control/wall/support

**ไฟล์:** `src/lib/negamon-species.ts`

**Approach ต่อ species:**
| Species | Role | Move Family |
|---------|------|------------|
| pyronox | Burst/Offense | Fire fast + Dark crit + Shadow power + Hell-dive ult |
| aerolisk | Tempo/Speed | Wind priority + Thunder chain + Speed boost + Skybreak ult |
| terranoir | Wall/Stall | Ground slow + Shield + Earth counter + Catacomb ult |
| lumilune | Support/Heal | Light heal + Status clear + Buff ally + Tidal mercy ult |
| voltshade | Control | Thunder paralysis + Dark debuff + Speed steal + Chain shock ult |
| tidemaw | Bruiser | Water bulk + Def break + Drain + Shell breaker ult |

---

### Task P3 — Dead-State Recovery

**เป้าหมาย:** battle ที่ค้างนานกว่า 24 ชม. ถูก auto-resolve

**ไฟล์:** `src/lib/game-negamon/server/battle-v4-completion.ts`, `battle-v4.ts`

**Approach:**
1. เพิ่ม `finishReason: "timeout"` ใน `BattleV4CompletionReason`
2. เพิ่ม API: `POST /battle/v4/timeout` — teacher หรือ system เรียกได้
3. timeout resolution: ฝ่ายที่ HP เหลือมากกว่าชนะ

---

## QA Checklist ก่อน Deploy

```bash
# Sprint 1
npm run check:negamon-battle         # ต้อง green ทั้งหมด
npm run check:negamon-reward-audit   # ต้อง green
npm run check:economy-shop-ledger    # ต้อง green (gold reward)
npx tsc --noEmit                     # 0 errors
node scripts/negamon-battle-v4-qa-fixture.mjs  # local เท่านั้น

# Sprint 2 เพิ่ม
npm run check:student-dashboard      # ตรวจ UI side
npm run check:live-game              # ตรวจ socket

# ทุก sprint
npm run check:i18n                   # ไม่มี hardcoded strings ใหม่
```

---

## Reference Files

| ไฟล์ | บทบาท |
|------|-------|
| `src/lib/game-negamon/server/battle-v4.ts` | Orchestrator หลัก |
| `src/lib/game-negamon/server/battle-v4-completion.ts` | Reward + progression |
| `src/lib/game-negamon/engine-showdown/adapter.ts` | Battle logic ทั้งหมด |
| `src/lib/game-negamon/engine-showdown/mapper.ts` | Negamon → Showdown |
| `src/lib/game-negamon/engine-showdown/state.ts` | State types |
| `src/lib/game-negamon/core/monster-snapshot.ts` | Snapshot factory |
| `src/lib/game-negamon/core/skill-unlock.ts` | Skill unlock rules |
| `src/lib/negamon-energy.ts` | Energy cost calculation |
| `src/lib/negamon-species.ts` | Species + moves data |
| `src/components/negamon/NegamonBattleArenaV4.tsx` | Battle UI |
| `scripts/negamon-battle-v4-qa-fixture.mjs` | E2E QA script |
