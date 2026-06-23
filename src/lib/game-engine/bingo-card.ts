import type { GameQuestion } from "../types/game";

/** ป้ายช่องฟรีกลางการ์ด (เฉพาะการ์ด 5x5) — มาร์คให้ตั้งแต่ต้นเกม */
export const BINGO_FREE_LABEL = "★";

export type BingoCardSize = 3 | 4 | 5;

/** ขนาดการ์ดที่รองรับ; ค่าอื่นจะถูก normalize เป็น 4 */
export function normalizeCardSize(value: unknown): BingoCardSize {
    return value === 3 || value === 4 || value === 5 ? value : 4;
}

/** มีช่องฟรีกลางเฉพาะการ์ด 5x5 ตามแผน */
export function hasFreeCenter(size: BingoCardSize): boolean {
    return size === 5;
}

/** จำนวนคำตอบที่ไม่ซ้ำกันที่ต้องใช้ = ช่องทั้งหมด ลบช่องฟรี (ถ้ามี) */
export function requiredDistinctAnswers(size: BingoCardSize): number {
    return size * size - (hasFreeCenter(size) ? 1 : 0);
}

/** ข้อความเฉลยของคำถาม (trim แล้ว) */
export function answerTextOf(question: GameQuestion): string {
    return (question.options[question.correctAnswer] ?? "").trim();
}

/** รวมเฉลยที่ไม่ซ้ำกันจากชุดคำถาม เรียงตามลำดับที่พบ */
export function collectAnswerPool(questions: GameQuestion[]): string[] {
    const seen = new Set<string>();
    const pool: string[] = [];
    for (const question of questions) {
        const text = answerTextOf(question);
        if (text.length === 0 || seen.has(text)) continue;
        seen.add(text);
        pool.push(text);
    }
    return pool;
}

/** Fisher-Yates แบบไม่แก้ของเดิม รับ rng เพื่อ deterministic ในเทสต์ */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * เลือกคลังคำตอบกลางสำหรับทั้งห้อง (ทุกคนใช้ชุดเดียวกัน แล้วค่อยสลับตำแหน่งต่อคน)
 * คืน null ถ้าคำตอบไม่ซ้ำกันมีไม่พอกับขนาดการ์ด
 */
export function buildWorkingAnswers(
    pool: string[],
    size: BingoCardSize,
    rng: () => number = Math.random
): string[] | null {
    const required = requiredDistinctAnswers(size);
    if (pool.length < required) return null;
    return shuffle(pool, rng).slice(0, required);
}

export type GeneratedCard = {
    card: string[];
    marked: boolean[];
};

/**
 * สร้างการ์ดหนึ่งใบจากคลังคำตอบกลาง (สลับตำแหน่งเฉพาะคน)
 * ความยาว workingAnswers ต้องเท่ากับ requiredDistinctAnswers(size)
 */
export function generateCard(
    workingAnswers: string[],
    size: BingoCardSize,
    rng: () => number = Math.random
): GeneratedCard {
    const total = size * size;
    const free = hasFreeCenter(size);
    const centerIndex = free ? Math.floor(total / 2) : -1;
    const shuffled = shuffle(workingAnswers, rng);

    const card: string[] = [];
    const marked: boolean[] = [];
    let next = 0;
    for (let i = 0; i < total; i++) {
        if (i === centerIndex) {
            card.push(BINGO_FREE_LABEL);
            marked.push(true);
        } else {
            card.push(shuffled[next++] ?? "");
            marked.push(false);
        }
    }
    return { card, marked };
}

/** นับจำนวนแถวที่มาร์คครบ: แนวนอน + แนวตั้ง + ทแยงสองเส้น */
export function countCompletedLines(marked: boolean[], size: BingoCardSize): number {
    const at = (row: number, col: number) => marked[row * size + col] === true;
    let lines = 0;

    for (let row = 0; row < size; row++) {
        let all = true;
        for (let col = 0; col < size; col++) {
            if (!at(row, col)) { all = false; break; }
        }
        if (all) lines++;
    }

    for (let col = 0; col < size; col++) {
        let all = true;
        for (let row = 0; row < size; row++) {
            if (!at(row, col)) { all = false; break; }
        }
        if (all) lines++;
    }

    let diagMain = true;
    let diagAnti = true;
    for (let i = 0; i < size; i++) {
        if (!at(i, i)) diagMain = false;
        if (!at(i, size - 1 - i)) diagAnti = false;
    }
    if (diagMain) lines++;
    if (diagAnti) lines++;

    return lines;
}
