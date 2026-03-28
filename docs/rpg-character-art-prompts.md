# RPG Character Art Prompts

ไฟล์ prompt หลักสำหรับใช้งานจริงอยู่ที่:

- [src/lib/game/rpg-art-prompts.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game/rpg-art-prompts.ts)

ภายในมี prompt ครบทุกอาชีพและทุกรูปแบบต่อไปนี้:

- `male`
- `female`
- `chibi`
- `pixel`
- `portraitCard`
- `fullBody`

รวมอาชีพ:

- `Warrior`
- `Mage`
- `Assassin`
- `Archer`
- `Paladin`
- `Berserker`
- `Cleric`
- `Necromancer`
- `Monk`
- `Engineer`

ค่ากลางที่ใช้ร่วมกัน:

- `RPG_ART_STYLE_BASE`
- `RPG_ART_NEGATIVE_PROMPT`

ตัวอย่างการใช้งาน:

```ts
import {
  RPG_ART_NEGATIVE_PROMPT,
  RPG_CLASS_ART_PROMPTS,
} from "@/lib/game/rpg-art-prompts";

const prompt = RPG_CLASS_ART_PROMPTS.Warrior.fullBody;
const negative = RPG_ART_NEGATIVE_PROMPT;
```

คำแนะนำสัดส่วนภาพ:

- `fullBody`: `2:3`
- `portraitCard`: `3:4`
- `chibi`: `1:1`
- `pixel`: `1:1`

ถ้าใช้ Midjourney ให้ต่อท้าย:

```text
--ar 2:3 --stylize 200
```
