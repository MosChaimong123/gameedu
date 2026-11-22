# Civilization Idle: Phase 0 Gameplay Specification

สถานะ: Approved baseline สำหรับเริ่ม Phase 1 engine

เอกสารนี้ปิดขอบเขตกติกาของรุ่นแรกจากต้นแบบ `D:/Idle/civilization-idle` โดยเลือกเฉพาะเนื้อหาที่จำเป็นต่อเส้นทางยุคหินถึงยุคสำริด กติกาในเอกสารนี้เป็น source of truth ของ engine ใหม่ หากต่างจากต้นแบบให้ยึดเอกสารนี้

## 1. ขอบเขตรุ่นแรก

- เมืองเป็นของ `Student.id` หนึ่งเมืองต่อระเบียนนักเรียนในห้องเรียน
- มี 2 ยุคที่เล่นได้: Stone และ Bronze
- วงจรหลัก: เก็บทรัพยากร -> สร้างอาคาร -> จัดคนงาน -> สะสม Science -> วิจัย -> เปลี่ยนยุค
- สถานะและเวลาเป็น server-authoritative; client ใช้เพื่อแสดงผลและส่งคำสั่งเท่านั้น
- ไม่มี PvP, leaderboard, reward เข้า GameEdu, Gold economy, Trader, Specialists, Prestige, โฆษณา และ import/export local save
- ไม่มี auto-repeat ใน Phase 1; เตรียม field รองรับแต่ยังเปิดใช้ไม่ได้
- ใช้เลข JavaScript แบบ finite number ในสองยุคแรก ไม่ใช้ `break_infinity.js`; ทุกค่าต้องผ่าน `Number.isFinite`

## 2. สถานะเริ่มต้น

| ค่า | เริ่มต้น | ความจุ |
| --- | ---: | ---: |
| Food | 50 | 200 |
| Population | 2 | 10 |
| Wood | 20 | 100 |
| Stone | 10 | 100 |
| Science | 0 | 1,000 |
| Copper | 0 | 200 |
| Bronze | 0 | 200 |
| Iron | 0 | 200 |
| Idle workers | 2 | เท่ากับ Population ลบคนงานที่มอบหมาย |
| Era | Stone | - |

Science cap ใช้ 1,000 แทน 500 จากต้นแบบ เพราะ `steam_power` ราคา 800 และต้นแบบไม่มีอาคารเพิ่มคลัง Science ทำให้เส้นทางเดิมเล่นไม่จบ

ทรัพยากร Bronze ต้องมีอยู่ใน snapshot ตั้งแต่เริ่มแต่ไม่แสดงและไม่รับคำสั่งจนกว่าจะเข้าสู่ Bronze ค่า resource ภายในเก็บทศนิยม แต่ UI ปัดเพื่อแสดงไม่เกิน 2 ตำแหน่ง ห้ามปัดค่าจริงทุก tick

## 3. กติกาเวลาและทรัพยากร

- Engine รับ `nowMs` จาก caller ห้ามเรียก `Date.now()` ภายใน domain logic
- การจำลองแบ่งเป็นช่วงย่อยไม่เกิน 1 วินาที เพื่อให้ starvation, cap และ converter ให้ผลคงที่แม้ sync ห่างกัน
- ทุก resource อยู่ในช่วง `0 <= amount <= cap` และ Population เป็นจำนวนเต็ม
- อัตราสุทธิที่แสดงเป็นค่าคำนวณ ไม่บันทึกลง snapshot
- Phase 1 จำลองเวลาออนไลน์ต่อคำสั่งได้ไม่เกิน 30 วินาที ส่วน offline progress 8 ชั่วโมงเป็นงาน Phase 4
- เวลาจาก client ไม่มีผลต่อ simulation

### ประชากรและอาหาร

- ประชากรแต่ละคนกิน Food 0.5 ต่อวินาที
- เมื่อ Food มากกว่า 0 และ Population ต่ำกว่า cap ให้ประชากรใหม่ 1 คนทุก 8 วินาที และเพิ่ม Idle worker 1 คน
- `animal_husbandry` เพิ่มความเร็วเติบโต 50% ทำให้ช่วงเวลาเป็น `8 / 1.5 = 5.333...` วินาที
- เมื่อ Food เป็น 0 ให้หยุดความคืบหน้าประชากรและรีเซ็ต progress เป็น 0
- ขณะอดอยาก ผลผลิต passive ของคนงานเหลือ 25%; manual action ยังให้ผลปกติ เพื่อให้ผู้เล่นกู้สถานการณ์ได้
- การลด Population เพราะอดอาหารยังไม่อยู่ในรุ่นแรก

## 4. Manual actions

| ID | ชื่อ | ยุค | Cooldown | ผลตอบแทน | ค่าอัปเกรดเริ่มต้น | Scaling |
| --- | --- | --- | ---: | --- | --- | ---: |
| `gather_fruit` | เก็บผลไม้ป่า | Stone | 3,000 ms | Food 3 | Food 15 | 1.45 |
| `chop_wood` | ตัดกิ่งไม้ | Stone | 4,000 ms | Wood 3 | Wood 15 | 1.45 |
| `mine_stone` | สกัดหิน | Stone | 5,000 ms | Stone 2 | Stone 12 | 1.50 |
| `pan_copper` | ร่อนแร่ทองแดง | Bronze | 4,500 ms | Copper 2 | Copper 20 | 1.50 |
| `forge_iron` | ตีเหล็กหยาบ | Bronze | 5,500 ms | Iron 2 | Iron 25 | 1.50 |

- `START_ACTION` สร้าง `readyAt`; action เดิมเริ่มซ้ำไม่ได้จนกว่าจะเสร็จ
- เมื่อคำสั่งหรือ sync ถัดไปผ่าน `readyAt` จึงรับผลตอบแทนหนึ่งครั้ง การส่ง command ซ้ำต้องไม่ให้ผลซ้ำ
- ระดับเริ่มต้น 1 และสูงสุด 5 ในรุ่นแรก
- ราคาอัปเกรดระดับปัจจุบัน: `floor(baseCost * scaling^(level - 1))`
- ผลตอบแทน: `round(baseReward * 1.5^(level - 1))`
- Cooldown: `max(600, baseCooldown * 0.93^(level - 1) - techFlatReduction)`
- โบนัส `production_bonus` จาก Tech ไม่เพิ่ม manual reward เพื่อให้ผลตอบแทนและข้อความปุ่มตรงกัน

## 5. งานและผลผลิต Passive

| ID | งาน | ผลิตต่อคน/วินาที | เงื่อนไข |
| --- | --- | ---: | --- |
| `forager` | คนเก็บผลไม้ | Food 0.8 | เปิดตั้งแต่เริ่ม |
| `woodcutter` | คนตัดไม้ | Wood 0.5 | เปิดตั้งแต่เริ่ม |
| `hunter` | นักล่าสัตว์ | Food 1.5 | มี `hunting_ground` |
| `miner` | คนขุดหิน | Stone 0.4 | มี `stone_mine` |
| `scientist` | นักปราชญ์ | Science 0.4 | มี `storytelling_circle` |

- จำนวนคนงานของแต่ละงานเป็นจำนวนเต็มไม่ติดลบ
- ผลรวมคนงานและ Idle workers ต้องเท่ากับ Population เสมอ
- คำสั่งเพิ่มคนงานล้มเหลวถ้าไม่มี Idle worker; การถอนคนงานคืนเป็น Idle worker
- อัตราผลิต: `workers * baseRate * starvationMultiplier * (1 + ผลรวมโบนัส Tech ของ resource)`
- `Trader` และ Gold ไม่อยู่ในรุ่นแรก

## 6. อาคาร

ราคาครั้งที่ `count + 1` คือ `floor(baseCost * scaling^count)` แยกคำนวณต่อ resource ผลของอาคารสะสมตามจำนวน ยกเว้นอาคารที่ `maxCount = 1`

| ID | ชื่อ | ยุค | Base cost | Scaling | ผล |
| --- | --- | --- | --- | ---: | --- |
| `shelter` | เพิงพัก | Stone | Wood 10, Stone 5 | 1.25 | Population cap +2 |
| `granary` | ยุ้งฉาง | Stone | Wood 20, Stone 10 | 1.35 | Food cap +150 |
| `stockpile` | ลานกองวัสดุ | Stone | Wood 25, Stone 15 | 1.35 | Wood cap +150, Stone cap +150 |
| `hunting_ground` | ลานล่าสัตว์ | Stone | Wood 15 | 1.40 | ปลดล็อก Hunter, สูงสุด 1 |
| `stone_mine` | เหมืองหินตื้น | Stone | Wood 20, Stone 10 | 1.35 | ปลดล็อก Miner, สูงสุด 1 |
| `storytelling_circle` | ลานเล่านิทาน | Stone | Wood 30, Stone 20 | 1.50 | ปลดล็อก Scientist, สูงสุด 1 |
| `clay_brick_house` | บ้านอิฐดินเผา | Bronze | Wood 50, Copper 30 | 1.30 | Population cap +4 |
| `metal_warehouse` | คลังเก็บโลหะ | Bronze | Stone 80, Copper 40 | 1.40 | Copper/Bronze/Iron cap +300, Wood/Stone cap +200 |

`trading_post` ถูกตัดออกพร้อม Trader และ Gold เพื่อไม่สร้างระบบเศรษฐกิจที่ไม่มีผลต่อเส้นทางหลัก

## 7. Tech tree และการเปลี่ยนยุค

การวิจัยเป็นการซื้อทันทีด้วย Science ต้องมี prerequisite ครบและหักต้นทุนเพียงครั้งเดียว

### Stone

| ID | Science | Prerequisite | ผล |
| --- | ---: | --- | --- |
| `basic_tools` | 10 | ไม่มี | Passive Food +15% |
| `foraging` | 25 | `basic_tools` | `gather_fruit` cooldown -800 ms |
| `logging` | 25 | `basic_tools` | `chop_wood` cooldown -800 ms |
| `masonry` | 40 | `basic_tools` | Passive Stone +30% |
| `animal_husbandry` | 50 | `foraging` | Population growth +50% |
| `agriculture` | 150 | `animal_husbandry`, `logging`, `masonry` | Passive Food +50% และปลดล็อก Bronze |

เมื่อซื้อ `agriculture` สำเร็จ ให้ Bronze อยู่ใน `unlockedEras` แล้วเปลี่ยนยุคเมื่อผู้เล่นยืนยัน modal การปิด modal โดยไม่ยืนยันต้องไม่เปลี่ยนยุค

### Bronze

| ID | Science | Prerequisite | ผล |
| --- | ---: | --- | --- |
| `smelting` | 200 | `agriculture` | ปลดล็อก `copper_smelter` |
| `bronze_working` | 300 | `smelting` | ปลดล็อก `bronze_foundry` |
| `iron_working` | 400 | `bronze_working` | ปลดล็อก `iron_forge` |
| `writing` | 250 | `agriculture` | Passive Science +50% |
| `steam_power` | 800 | `iron_working`, `writing` | ทำเครื่องหมาย Bronze complete |

Phase 0-4 ยังไม่เปิด Industrial content หลัง `steam_power`; UI แสดงว่าสำเร็จเนื้อหารุ่นปัจจุบันแทน การปลดล็อก Industrial จะเพิ่มภายหลังพร้อมข้อมูลยุคนั้น

## 8. Converters ยุค Bronze

| ID | Tech | Base cost | Scaling | Input ต่อวินาที | Output ต่อวินาที |
| --- | --- | --- | ---: | --- | --- |
| `copper_smelter` | `smelting` | Stone 40, Wood 25 | 1.35 | Wood 0.5 | Copper 0.4 |
| `bronze_foundry` | `bronze_working` | Stone 70, Copper 40 | 1.40 | Copper 0.5, Wood 0.3 | Bronze 0.3 |
| `iron_forge` | `iron_working` | Stone 90, Bronze 40 | 1.40 | Wood 0.8, Stone 0.2 | Iron 0.3 |

- Converter เริ่ม enabled หลังสร้าง แต่ผู้เล่นปิด/เปิดได้
- ทำงานแบบ all-or-nothing ในแต่ละ simulation step
- ถ้าวัตถุดิบไม่พอหรือ output ใดเต็ม ให้พัก converter โดยไม่หัก input
- ราคาเครื่องที่ `count + 1` ใช้สูตรเดียวกับอาคาร
- โบนัส Tech ของ output ใช้กับ converter เมื่อในอนาคตมี Tech ที่เกี่ยวข้อง

## 9. ลำดับเล่นอ้างอิง

1. เริ่มด้วย Population 2, Food 50, Wood 20 และ Stone 10
2. มอบหมาย Forager อย่างน้อย 1 คน และใช้ manual actions รักษาอาหารพร้อมสะสม Wood/Stone
3. สร้าง Hunting Ground หรือ Stone Mine เพื่อเพิ่มอัตราทรัพยากร แล้วสร้าง Storytelling Circle
4. มอบหมาย Scientist สะสม Science และวิจัยเส้น `basic_tools` พร้อมแขนงที่กำหนด
5. ซื้อ `agriculture` หลังจ่าย Science รวมขั้นต่ำ 300 แล้วเข้าสู่ Bronze
6. เก็บ Copper ด้วย action หรือสร้าง Copper Smelter หลังวิจัย `smelting`
7. ผลิต Bronze, เปิด Iron Forge, วิจัย `writing` และสะสม Science ถึง `steam_power`
8. ซื้อ `steam_power` เพื่อจบเนื้อหา Bronze รุ่นแรก โดยไม่ต้องรับรางวัลจากระบบอื่น

ลำดับนี้ต้องเล่นได้จาก initial state โดยไม่ใช้ Gold, Specialist, โฆษณา หรือข้อมูลที่ผู้เล่นแก้จาก client

## 10. ข้อแตกต่างที่ตั้งใจจากต้นแบบ

| จุดในต้นแบบ | ข้อกำหนดใหม่ |
| --- | --- |
| Tech แสดง production/population bonus แต่ store ไม่คำนวณ | Engine ใหม่ต้องใช้โบนัสตามสูตรในเอกสารนี้ |
| Science cap 500 แต่ `steam_power` ราคา 800 | Science cap เริ่มต้น 1,000 |
| Converter หัก input แม้ output เต็ม | พักโดยไม่หัก input |
| Action upgrade ไม่มีเพดาน | จำกัดระดับ 5 ในรุ่นแรก |
| Modal ยุคสามารถเพิ่ม unlocked era ตอน dismiss | ปลดล็อกเมื่อซื้อ Tech แต่เปลี่ยน current era เฉพาะคำสั่งยืนยัน |
| Store ใช้ `Date.now()` และ `Math.random()` | Engine รับเวลาและ RNG จาก caller; รุ่นแรกไม่มีระบบสุ่ม |
| LocalStorage เป็นสถานะหลัก | Database snapshot เป็น canonical state |

## 11. เกณฑ์ยอมรับ Phase 0

- [x] ระบุสถานะเริ่มต้นและความจุทุก resource ที่ใช้
- [x] ระบุ manual actions, jobs, buildings, technologies และ converters ของสองยุค
- [x] ระบุสูตรราคา ผลผลิต cooldown ประชากร starvation และ cap
- [x] ระบุเงื่อนไขเข้าสู่ Bronze และจบ Bronze
- [x] มีเส้นทางเล่นจบโดยไม่พึ่งระบบรางวัลภายนอก
- [x] แก้ deadlock Science cap และพฤติกรรมที่ต้นแบบประกาศแต่ไม่ทำงาน
- [x] กำหนดสิ่งที่เลื่อนไปเฟสหลังอย่างชัดเจน

Phase 0 เสร็จสมบูรณ์ งานถัดไปคือสร้าง pure deterministic engine และ unit tests ตามเอกสารนี้
