# Negamon V4 Battle Engine — CLAUDE.md

Claude โหลดไฟล์นี้อัตโนมัติเมื่อทำงานใน `src/lib/game-negamon/`

---

## ภาพรวม: ระบบทำงานยังไง

การต่อสู้ Negamon V4 ทำงานเป็น **server-authoritative** หมายความว่า client แค่ส่ง action มา server คำนวณทุกอย่างแล้วส่งผลกลับไป ไม่มีการคำนวณที่ฝั่ง client

ขั้นตอนการต่อสู้หนึ่งครั้ง:
```
1. ครูสร้าง classroom → นักเรียนมี Negamon
2. นักเรียนท้าต่อสู้ → server สร้าง BattleSession ใน MongoDB
3. ทั้งสองฝ่ายส่ง action ผ่าน HTTP → server resolve → ส่ง state กลับ
4. ต่อสู้จบ → server จ่าย gold/XP อัตโนมัติ
```

---

## โครงสร้างไฟล์

```
core/
  monster-growth.ts      — คำนวณ stat จาก baseStats × level × role
  monster-snapshot.ts    — สร้าง NegamonMonsterSnapshot (ข้อมูล Negamon พร้อมต่อสู้)
  skills.ts              — ท่าทั้งหมด (NegamonSkillDefinition + energyCost)
  skill-unlock.ts        — ท่าไหนปลดล็อคได้ที่ level ไหน
  rules/
    damage.ts            — สูตรคำนวณ damage (STAB, type multiplier, crit)
    stat-stages.ts       — stat stage +/- เช่น attack up/down
    type-multiplier.ts   — ตารางความได้เปรียบ type (เช่น fire > grass)
  session-v4.ts          — schema ของ BattleSession ที่เก็บใน MongoDB
  battle-items.ts        — ไอเทมใช้ในการต่อสู้
  battle-rewards.ts      — คำนวณ XP ที่ได้จากการต่อสู้

engine-showdown/
  adapter.ts             — สะพานระหว่าง V4 state กับ Pokémon Showdown engine
  mapper.ts              — แปลง NegamonMonsterSnapshot → Showdown team set
  negamon-stats-rule.ts  — custom rule ที่ inject stats จริงของ Negamon เข้า Showdown
  state.ts               — type ทั้งหมดของ V4 (choice, action, event, combatant)

server/
  battle-v4.ts           — API: createBattle, getBattleState, resolveAction
  battle-v4-completion.ts — จ่าย gold/XP หลังต่อสู้จบ
  skill-loadout.ts       — สร้าง loadout ท่าให้นักเรียน (auto-build)
  progression.ts         — คำนวณ level up, evolution
```

---

## จุดสำคัญที่ต้องรู้ก่อนแตะโค้ด

### 1. Pokémon Showdown คืออะไรในระบบนี้

Negamon V4 ใช้ engine จริงของ Pokémon Showdown (`pokemon-showdown` npm) สำหรับ **คำนวณ damage และ stat** เพราะ Showdown มีระบบที่ถูกต้องและผ่านการทดสอบมาแล้ว

แต่ Showdown รู้จักแค่ Pokémon จริงๆ ไม่รู้จัก Negamon จึงต้องใช้ **proxy species** (เช่น pyronox → Houndoom)

### 2. B1 Fix — Stat Injection (สำคัญมาก)

**ปัญหาเดิม:** Showdown คำนวณ damage จาก stat ของ proxy species (Houndoom) ไม่ใช่ stat จริงของ Negamon

**วิธีแก้ (B1):** สร้าง custom rule ชื่อ `negamonstatsmod` ที่ hook เข้า `onModifySpecies` แล้ว override `baseStats` ด้วย stat จริงของ Negamon ทุกครั้งที่ Showdown จะใช้งาน

format ที่ใช้: `"gen9customgame@@@Negamon Stats Mod"`

ไฟล์ที่เกี่ยวข้อง: `engine-showdown/negamon-stats-rule.ts`

### 3. Stat Axis Remap — ต้องระวัง

Negamon และ Showdown ใช้ชื่อ stat ต่างกัน:

| Negamon | Showdown | ความหมาย |
|---------|----------|----------|
| `spd` | `spe` | ความเร็ว (speed) |
| `def` | `def` + `spd` | ป้องกัน (Negamon มี def เดียว แต่ Showdown แยก physical/special) |
| `spa` | `spa` | special attack (เพิ่งเพิ่มใน B1) |
| `atk` | `atk` | physical attack |

**HP พิเศษ:** HP ของ Negamon มักเกิน 255 (เช่น terranoir = 510) ซึ่ง Showdown clamp ไว้ที่ 255 → ต้องใช้ `species.maxHP` field แทน

### 4. spa (Special Attack) — optional field

`spa` เพิ่งเพิ่มใน B1 ทำให้ยัง `optional` ใน `MonsterBaseStats`:
- species เก่าที่ไม่มี `spa` → ใช้ `atk` เป็น fallback
- ดู `src/lib/types/negamon.ts` — `spa?: number`
- ดู `src/lib/negamon-species.ts` — ทุก species มี `spa` แล้วทั้ง 6 ตัว

### 5. 6 Species และ Role

| Species | Role | เด่น |
|---------|------|------|
| pyronox | burst | physical attacker (atk 192 > spa 130) |
| aerolisk | tempo | เร็วสุด (spd 198) |
| terranoir | wall | HP สูงสุด (510) + def สูง |
| lumilune | support | special attacker (spa 190 > atk 136) |
| voltshade | control | balanced special (spa = atk = 184) |
| tidemaw | bruiser | physical tank (atk 180, HP 468) |

### 6. Damage Formula

```
damage = (power × atk/def ratio) × STAB × typeMultiplier × crit × random
```
- STAB = 1.5 (ถ้า type ของท่าตรงกับ type ของ Negamon)
- PHYSICAL moves → ใช้ `atk` vs `def`
- SPECIAL moves → ใช้ `spa` vs `specialDefense`
- STATUS moves → damage = 0

ดูใน: `core/rules/damage.ts`

---

## การเพิ่ม/แก้ไขท่า (Skills)

ท่าทุกท่าอยู่ใน `core/skills.ts` — แต่ละท่ามี:
- `energyCost` — ค่า energy ที่ใช้ต่อท่า
- `category` — `PHYSICAL | SPECIAL | STATUS`
- `type` — ประเภทธาตุ (เช่น fire, water)
- `power` — ความแรงฐาน

เมื่อเพิ่มท่าใหม่ ต้องตรวจว่า `energyCost` ถูก pass ผ่านถึง `createChoiceForMove()` ใน `adapter.ts` ด้วย (ดู Plan 31 Task B2)

---

## Flow การ Resolve การต่อสู้

```
นักเรียนส่ง action
    → server/battle-v4.ts:resolveAction()
        → โหลด BattleSession จาก MongoDB
        → engine-showdown/adapter.ts:resolveTurn()
            → ส่งท่าเข้า Showdown BattleStream
            → Showdown คำนวณ damage (ใช้ injected Negamon stats)
            → parse ผลออกมาเป็น NegamonBattleEventV4[]
        → อัพเดท state กลับ MongoDB
    → ส่ง state ใหม่กลับ client
```

---

## Tests

```bash
# รัน test ทั้งหมดที่เกี่ยวกับ Negamon + type-check
npm run check:negamon-battle

# รัน test ไฟล์เดียว
node ./node_modules/vitest/vitest.mjs run --config vitest.config.mts --pool threads src/lib/game-negamon/__tests__/showdown-adapter.test.ts
```

test ที่สำคัญ:
- `__tests__/showdown-adapter.test.ts` — integration test กับ Showdown จริง
- `__tests__/special-attack-stat.test.ts` — verify spa ทุก species
- `__tests__/b1-negamon-stats-injection-poc.test.ts` — prove stat injection ทำงาน
