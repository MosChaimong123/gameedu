# 43 — Bingo Game Mode ("Quiz Bingo") — แผนออกแบบและพัฒนา

> สถานะ: **✅ เฟส 1–5 เสร็จครบ — พร้อมใช้งานจริง** (core + wiring + UI นักเรียน + UI ครู + persistence/polish)
> โหมดเกมใหม่ลำดับถัดจาก Gold Quest / Crypto Hack / Negamon Battle
> ตัดสินใจหลักแล้ว: **ครูคุมจังหวะ + เลือกขนาดการ์ดได้ + ชนะด้วยการสะสมแถว**
> อัปเดตล่าสุด: 2026-06-22

---

## 1. แนวคิดหลัก — "Quiz Bingo" (บิงโกความรู้)

การ์ดบิงโกของนักเรียนไม่ใช่ตัวเลข แต่เป็น **"คำตอบ/คำศัพท์"** ที่ดึงมาจากเฉลยในชุดคำถามเดิม
เมื่อครูถามคำถาม นักเรียนต้องรู้คำตอบ แล้ว **แตะช่องบนการ์ดที่เป็นคำตอบนั้น** ถ้าถูก = ช่องถูกมาร์ค
ต่อกันเป็นแถว (แนวตั้ง / แนวนอน / ทแยง) = ได้ 1 แต้ม **คะแนน = จำนวนแถวสะสม**

### ทำไมถึงได้ความรู้จริง + สนุก + ยุติธรรม
- บังคับให้นักเรียนเข้าใจเนื้อหา (ต้องเลือกช่องถูก ไม่ใช่แค่ตัวเลขสุ่ม)
- เล่นพร้อมกันทั้งห้อง ลุ้นเหมือนบิงโกจริง คุมจังหวะโดยครู
- **ใช้ชุดคำถามเดิมได้เลย ครูไม่ต้องเตรียมคอนเทนต์ใหม่**
- ทุกคนได้คลังคำตอบชุดเดียวกัน (สลับตำแหน่งคนละแบบ) → มีสิทธิ์มาร์คทุกข้อเท่ากัน ความเก่งอยู่ที่ "รู้คำตอบ + หาช่องถูก"

### การตัดสินใจที่ล็อกแล้ว
| หัวข้อ | ตัวเลือกที่เลือก |
|--------|------------------|
| จังหวะการเล่น | **ครูคุมจังหวะ** (host-paced) — ครูกดถามทีละข้อให้ทั้งห้องพร้อมกัน |
| ขนาดการ์ด | **เลือกได้ก่อนเริ่มเกม** — 3x3, 4x4, 5x5(+ช่องฟรีกลาง) |
| เงื่อนไขชนะ | **สะสมแต้มตามจำนวนแถว** — คะแนน = จำนวนแถวที่ทำได้ |
| โทษการแตะผิด | แตะผิด = พลาดข้อนั้น (1 แตะ/ข้อ กันสุ่มมั่ว) — *ยังเปิดให้ปรับได้* |

---

## 2. กลไกการเล่นโดยละเอียด (host-paced)

1. ครูเลือกโหมด Bingo → ตั้งค่า (ขนาดการ์ด, จำนวนแถวที่ชนะ หรือเวลา) → กด Host Game
2. ครูกด Start → เซิร์ฟเวอร์:
   - ดึง **เฉลยที่ไม่ซ้ำกัน** จากชุดคำถามมาเป็น `workingAnswers` (จำนวน = จำนวนช่องการ์ด)
   - สร้างการ์ดให้นักเรียนแต่ละคน = `workingAnswers` ที่สลับตำแหน่งเฉพาะคน
   - ส่ง `bingo-card` ให้แต่ละคน
3. ครูกด "ถามข้อต่อไป" → broadcast `bingo-question` (โจทย์ + รูป **ไม่ส่งตัวเลือก** เพราะการ์ดคือคลังคำตอบ)
   - หน้าจอครูแสดงโจทย์ **พร้อมเฉลยกำกับ** ไว้ให้ครูอ่าน
4. นักเรียนเห็นโจทย์ → แตะช่องที่คิดว่าใช่
   - เซิร์ฟเวอร์เช็ก: ข้อความช่องที่แตะ == เฉลยของข้อปัจจุบันหรือไม่
   - แตะถูก → `marked[cell] = true`, นับแถวใหม่, `correctAnswers++`
   - แตะผิด → `incorrectAnswers++` (ไม่มาร์ค)
   - กดได้ครั้งเดียวต่อข้อ (`answeredCurrentIndex`)
5. ถ้ามีแถวใหม่เกิดขึ้น → `completedLines` เพิ่ม → broadcast กระดานสด
6. ครูกดถามข้อต่อไป วนซ้ำ
7. จบเกมเมื่อ: หมดเวลา **หรือ** มีผู้เล่นถึงจำนวนแถวเป้าหมาย **หรือ** ครูกดจบ
   - คะแนน = `completedLines` (เสมอ → ตัดด้วย `correctAnswers` แล้วเวลาที่ถึงก่อน)

### การคุมว่าครูถามข้อไหน
- `questionOrder` = สุ่มลำดับคำถามที่ **เฉลยอยู่ใน `workingAnswers`** เท่านั้น (ไม่ซ้ำจนหมดแล้ววน)
- คำถามหลายข้อที่เฉลยตรงช่องเดียวกันได้ → ช่วยตอกย้ำเนื้อหา ไม่เป็นปัญหา

---

## 3. แมปกับสถาปัตยกรรมเดิม (ต่อยอด ไม่รื้อ)

ทุกเกมสืบทอดจาก `AbstractGameEngine` และใช้ `GameQuestion` (โจทย์ + ตัวเลือก + เฉลย) ร่วมกัน

| ส่วน | ของเดิมที่ใช้ซ้ำ | ที่ต้องเพิ่ม |
|------|-----------------|-------------|
| Engine | `AbstractGameEngine` (lobby, reconnect, persist, tick, endGame) | `BingoEngine extends AbstractGameEngine` |
| คำถาม | `GameQuestion` เดิม | ใช้ได้เลย ไม่ต้องแก้ชุดคำถาม |
| ลงทะเบียนเกม | `manager.createGame` / `recoverGames` | เพิ่ม branch `"BINGO"` |
| Socket | `register-game-socket-handlers` | เพิ่ม `mark-cell` (ผู้เล่น) + `bingo-next` (host-gated) |
| เลือกโหมด | `game-mode-selector` MODE_DEFS | เพิ่ม def `bingo` (`active: true`) |
| ฝั่งผู้เล่น | `play/game` view system | เพิ่ม view `BINGO_CARD` + type `BingoPlayer` |
| Persistence | `serialize()` / `restore()` ฐานของ Abstract | ขยาย state (การ์ด/มาร์ค/ลำดับข้อ) |

---

## 4. โครงข้อมูล (Types)

```ts
// src/lib/types/game.ts

type BingoPlayer = BasePlayer & {
  card: string[];               // ข้อความคำตอบต่อช่อง (สลับเฉพาะคน)
  marked: boolean[];            // ช่องไหนมาร์คแล้ว (free center = true)
  completedLines: number;       // = score
  answeredCurrentIndex: number; // index ข้อล่าสุดที่ตอบไปแล้ว (กัน 1 แตะ/ข้อ)
};

// ขยาย GameSettings
cardSize?: 3 | 4 | 5;     // 3x3 / 4x4 / 5x5(+ช่องฟรีกลาง)
bingoLinesToWin?: number; // ชนะเมื่อถึงกี่แถว (คู่กับ winCondition: "LINES")

// ขยาย winCondition union: "TIME" | "GOLD" | "LINES"
```

State ระดับเกม (เก็บใน `serialize().state`): `workingAnswers`, `questionOrder`, `currentQuestionIndex`
→ ใช้ตอน reconnect host และ recover เกมหลัง restart

---

## 5. Socket Events

| ทิศทาง | event | payload | หน้าที่ |
|--------|-------|---------|---------|
| → server (host) | `bingo-next` | `{ pin }` | ตรวจ `isHostSocket` → advance ข้อ → broadcast `bingo-question` |
| → server (ผู้เล่น) | `mark-cell` | `{ pin, cellIndex }` | ตรวจช่อง == เฉลยข้อปัจจุบัน → มาร์ค/นับแถว |
| server → คน | `bingo-card` | `{ card }` | ส่งการ์ดตอนเริ่ม / ตอน join |
| server → all | `bingo-question` | `{ id, question, image, index, total }` | โจทย์ (ไม่ส่งตัวเลือกให้ผู้เล่น) |
| server → คน | `mark-result` | `{ cellIndex, correct, completedLines, newBingo }` | ผลการแตะ |
| server → all | `game-state-update` | players (lines) | กระดานสด / leaderboard |
| server → all | `game-over` | players | จบเกม (มีอยู่แล้วใน Abstract) |

> `bingo-next` ต้องเป็น host-gated เหมือน `start-game` / `end-game` (เช็ก `isHostSocket` ก่อนเรียก engine)

---

## 6. อัลกอริทึมหลัก (ไฟล์ `bingo-card.ts` — ฟังก์ชันบริสุทธิ์ เทสต์ง่าย)

```
answerTextOf(q)         = q.options[q.correctAnswer]
buildWorkingAnswers()   = unique(questions.map(answerTextOf)) → สุ่มเลือก N ช่อง
generateCard(working)   = shuffle(working) → คืน string[]  (5x5 ใส่ FREE กลาง, marked กลาง=true)
countCompletedLines(marked, size) = นับ row + column + diagonal ที่มาร์คครบ
```

การมาร์ค (ใน engine):
```
ถ้า answeredCurrentIndex == currentIndex → ignore (แตะซ้ำ)
correctText = answerTextOf(currentQuestion)
tappedText  = player.card[cellIndex]
isCorrect   = tappedText === correctText && !player.marked[cellIndex]
ถ้าถูก: marked[cellIndex]=true; lines=countCompletedLines(...); correctAnswers++
ถ้าผิด: incorrectAnswers++
answeredCurrentIndex = currentIndex
emit mark-result; statusUpdate()
```

---

## 7. ไฟล์ที่จะสร้าง / แก้ (รูปธรรม)

### สร้างใหม่
- `src/lib/game-engine/bingo-card.ts` — `buildWorkingAnswers`, `generateCard`, `countCompletedLines`
- `src/lib/game-engine/bingo-engine.ts` — `BingoEngine extends AbstractGameEngine`
- `src/lib/game-engine/__tests__/bingo-card.test.ts`
- `src/lib/game-engine/__tests__/bingo-engine.test.ts`
- `src/components/game/bingo/bingo-client.tsx` — การ์ดฝั่งนักเรียน
- `public/assets/bingo-v2.png` — ไอคอนโหมด (ชั่วคราว / ขอจาก designer)

### แก้ของเดิม
- `src/lib/types/game.ts` — `BingoPlayer`, `winCondition: "LINES"`, settings `cardSize` / `bingoLinesToWin`
- `src/lib/game-engine/manager.ts` — register `BINGO` ใน `createGame` + `recoverGames`
- `src/lib/socket/register-game-socket-handlers.ts` — normalize mode `BINGO` + event `mark-cell` + `bingo-next`
- `src/components/host/game-mode-selector.tsx` — เพิ่ม MODE_DEF `bingo` (`active: true`)
- `src/app/play/game/play-game-types.ts` — `BINGO` ใน `PlayerMode`, `BingoPlayer` ใน `PlayerState`, view `BINGO_CARD`, `createBingoPlayer`, score accessor
- `src/app/play/game/page.tsx` + `use-play-game-socket.ts` — รับ event/view ใหม่
- `src/app/host/[setId]/page.tsx` — UI ตั้งค่า (ขนาดการ์ด/แถวชนะ) + ปุ่ม "ถามข้อต่อไป" + กระดานสด
- `src/lib/translations.ts` — host mode title/desc/duration + UI strings (TH/EN)
- `src/lib/socket-error-messages.ts` — ข้อความ error ของ Bingo

---

## 8. แผนพัฒนาเป็นเฟส (Checklist)

### ✅ เฟส 1 — Core logic (เสร็จ 2026-06-22)
- [x] `bingo-card.ts` — `collectAnswerPool` / `buildWorkingAnswers` / `generateCard` / `countCompletedLines` / `normalizeCardSize` / `shuffle`
- [x] `bingo-engine.ts` — `BingoEngine` (แจกการ์ด, `revealNextQuestion`, มาร์คช่อง, นับแถว, ชนะแบบ LINES, serialize/restore)
- [x] `types/game.ts` — `BingoPlayer`, `winCondition: "LINES"`, settings `cardSize` / `bingoLinesToWin`
- [x] `socket-error-messages.ts` — error key 4 ตัว + prefix `playBingo`
- [x] `abstract-game.ts` — `emitToHost()` (ส่งเฉลยให้เฉพาะครู ไม่รั่วถึงผู้เล่น)
- [x] Unit tests `bingo-card.test.ts` + `bingo-engine.test.ts` — **22 ผ่าน**

### ✅ เฟส 2 — Wiring (เสร็จ 2026-06-22)
- [x] `manager.ts` — register `BINGO` ใน `createGame` + `recoverGames`
- [x] `register-game-socket-handlers.ts` — `GameMode` + normalize mode + event `mark-cell` (ผู้เล่น) + `bingo-next` (host-gated)
- [x] `play-game-types.ts` — `BINGO` ใน `PlayerMode`, `BingoPlayer` ใน `PlayerState`, view `BINGO_CARD`, `createBingoPlayer`, `isBingoPlayer`, score accessor + `toGoldQuestPlayer`
- [x] Integration tests — `mark-cell` forwarding + `bingo-next` host gating (socket suite **26 ผ่าน**)
- [x] `tsc --noEmit` ผ่านทั้งโปรเจกต์

### ✅ เฟส 3 — ฝั่งนักเรียน (เสร็จ 2026-06-22)
- [x] `bingo-client.tsx` (การ์ด grid ตามขนาด + มาร์คช่อง + เอฟเฟกต์บิงโก + แถบโจทย์/อันดับ/จำนวนแถว)
- [x] `play-game-types.ts` — `BingoClientState` / `BingoQuestionPayload`
- [x] `use-play-game-socket.ts` — รับ `bingo-card` / `bingo-question` / `mark-result`, guard `game-state-update` + `game-over` + `skipLegacySocketHandlers` สำหรับ BINGO
- [x] `page.tsx` — state `bingoState`, `handleMarkCell` (emit `mark-cell`), render view `BINGO_CARD`, จอจบเกมแสดงจำนวนแถว
- [x] `translations.ts` — player-facing bingo keys (TH/EN) + error keys 4 ตัว *(host strings ยกไปเฟส 4)*

### ✅ เฟส 4 — ฝั่งครู (เสร็จ 2026-06-22)
- [x] `game-mode-selector.tsx` — เพิ่ม MODE_DEF `bingo` (`active: true`)
- [x] `bingo-settings.tsx` — เลือกขนาดการ์ด (3/4/5) + เงื่อนไขชนะ (LINES/TIME) + จำนวนแถว/เวลา + toggles
- [x] `bingo-host-view.tsx` — โจทย์+เฉลย (host-only), ปุ่ม "ถามข้อต่อไป", กระดานสดเรียงตามแถว, PIN, จบเกม
- [x] `host/[setId]/page.tsx` — `BINGO` ใน mode/HostPlayer, `isBingoPlayer`, sort by lines, handleSelectMode, SETTINGS+PLAYING render, รับ `bingo-question`/`bingo-answer-reveal`, `handleBingoNextQuestion` (emit `bingo-next`), ENDED standings
- [x] `translations.ts` — host mode + settings + view strings (TH/EN)
- [x] ไอคอนโหมด `public/assets/bingo.svg` *(ใช้ SVG แทน png — คมชัดทุกความละเอียด)*

### ✅ เฟส 5 — Persistence + polish (เสร็จ 2026-06-22)
- [x] ตรวจ recover หลัง restart ด้วยเทสต์ — serialize→restore เก็บ card/marked/completedLines + workingAnswers/questionOrder/currentIndex ครบ และ reconnect เล่นต่อได้ (`bingo-engine.test.ts`)
- [x] เสียงเฉลิมฉลองฝั่งครูเมื่อมีคนได้แถวใหม่ (เทียบผลรวมแถวด้วย `bingoTotalLinesRef`) + จอจบเกมฝั่งครูแสดง "X แถว"
- [x] แก้ edge: host กด Start แล้วเฉลยไม่พอ → error handler ดึง view กลับ `LOBBY` (เกมยังไม่เริ่มฝั่งเซิร์ฟเวอร์)

---

## สรุปไฟล์ทั้งหมด (เฟส 1–5)

**Engine/logic:** `bingo-card.ts`, `bingo-engine.ts` (+ tests), `abstract-game.ts` (`emitToHost`)
**Wiring:** `manager.ts`, `register-game-socket-handlers.ts` (+ tests), `types/game.ts`, `socket-error-messages.ts`
**นักเรียน:** `components/game/bingo/bingo-client.tsx`, `play/game/*` (types, hook, page)
**ครู:** `components/host/settings/bingo-settings.tsx`, `components/game/bingo/bingo-host-view.tsx`, `host/[setId]/page.tsx`, `game-mode-selector.tsx`, `public/assets/bingo.svg`
**i18n:** `translations.ts` (TH/EN)

ผลตรวจรวม: `tsc` ผ่านทั้งโปรเจกต์ · lint สะอาด (เหลือ warning เดิม 1) · unit/integration tests ผ่านทั้งหมด

---

## 9. Edge cases ที่ออกแบบเผื่อ

- **เฉลยไม่พอ:** ชุดคำถามมีเฉลยไม่ซ้ำ < จำนวนช่อง → บล็อกตอน start พร้อมข้อความ "ใช้การ์ดเล็กลง หรือเพิ่มคำถาม"
  (5x5 ต้องมีเฉลยต่างกัน ≥ 24 ข้อ, 4x4 ≥ 16, 3x3 ≥ 9)
- **เข้าเกมสาย:** gen การ์ดให้ตอน join, เริ่มตามหลัง (คุมด้วย `allowLateJoin` เดิม)
- **Reconnect / รีเฟรช:** การ์ด + มาร์ค มาจาก persisted players state
- **เสมอ:** แถวเท่ากัน → ตัดด้วย `correctAnswers` แล้วเวลาที่ถึงก่อน
- **เฉลยข้อความซ้ำกันคนละข้อ:** dedupe ด้วยข้อความก่อนสร้างคลังคำตอบ
- **แตะข้อเดิมซ้ำ:** กันด้วย `answeredCurrentIndex`

---

## 10. ประเด็นที่ยังเปิดให้ตัดสินใจ

- โทษการแตะผิด: ตอนนี้ = พลาดข้อนั้น (1 แตะ/ข้อ) — จะเปลี่ยนเป็น "แตะแก้ได้จนกว่าจะถูก" ไหม
- ช่องฟรีกลางเฉพาะ 5x5 หรือให้เลือกเปิด/ปิดได้ทุกขนาด
- จะให้มี power-up / โบนัสความเร็วเหมือน Gold Quest ไหม (เฟสหลัง)
