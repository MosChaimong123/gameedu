import { getSubjectCurriculumMapPack } from "@/lib/curriculum/map-packs"
import {
    getCanonicalAdditionalSubjects,
    getCanonicalCoreSubjects,
    getCanonicalSubjectById,
    type CanonicalCoreSubjectId,
    type CanonicalSubjectId,
} from "@/lib/curriculum/subject-catalog"
import { isLessonContentV2 } from "@/lib/lessons/lesson-content"

export const CORE_SUBJECT_OPTIONS: CanonicalSubjectId[] = [
    ...getCanonicalCoreSubjects().map((subject) => subject.id),
    ...getCanonicalAdditionalSubjects()
        .filter((subject) => subject.lessonBuilderAvailability === "active")
        .map((subject) => subject.id),
]

export type LessonCurriculumContext = {
    subjectId: CanonicalSubjectId | null
    unitId: string | null
}

/**
 * Lessons authored before ฟิสิกส์ became a first-class additional subject stored unit ids
 * from the retired `src/lib/physics/curriculum` catalog (`phy-m4-s1-u01`). That catalog is
 * gone; this maps each retired unit onto its equivalent in the current pack so those lessons
 * keep resolving to a real unit instead of losing it.
 *
 * The pairing is by topic, not position — สสวท. moved several units between terms
 * (การเคลื่อนที่แนวโค้ง ม.4 เทอม 2 → เทอม 1, เสียง ม.5 เทอม 2 → เทอม 1).
 */
const RETIRED_PHYSICS_UNIT_IDS: Readonly<Record<string, string>> = {
    "phy-m4-s1-u01": "physics-additional-m4-s1-u01", // ธรรมชาติและพัฒนาการทางฟิสิกส์ → การศึกษาวิชาฟิสิกส์
    "phy-m4-s1-u02": "physics-additional-m4-s1-u02", // การเคลื่อนที่แนวตรง
    "phy-m4-s1-u03": "physics-additional-m4-s1-u03", // แรงและกฎการเคลื่อนที่
    "phy-m4-s2-u01": "physics-additional-m4-s2-u03", // สมดุลกล → สภาพสมดุล
    "phy-m4-s2-u02": "physics-additional-m4-s2-u01", // งานและพลังงาน
    "phy-m4-s2-u03": "physics-additional-m4-s2-u02", // โมเมนตัมและการชน
    "phy-m4-s2-u04": "physics-additional-m4-s1-u04", // การเคลื่อนที่แนวโค้ง
    "phy-m5-s1-u01": "physics-additional-m5-s1-u01", // การเคลื่อนที่แบบฮาร์มอนิกอย่างง่าย
    "phy-m5-s1-u02": "physics-additional-m5-s1-u02", // คลื่น → คลื่นกล
    "phy-m5-s1-u03": "physics-additional-m5-s2-u01", // แสงเชิงคลื่น → แสงเชิงกายภาพ
    "phy-m5-s1-u04": "physics-additional-m5-s1-u04", // แสงเชิงรังสี → แสงและทัศนอุปกรณ์
    "phy-m5-s2-u01": "physics-additional-m5-s1-u03", // เสียง
    "phy-m5-s2-u02": "physics-additional-m5-s2-u02", // ไฟฟ้าสถิต
    "phy-m5-s2-u03": "physics-additional-m5-s2-u03", // ไฟฟ้ากระแส
    "phy-m6-s1-u01": "physics-additional-m6-s1-u01", // แม่เหล็กและไฟฟ้า → แม่เหล็กไฟฟ้า
    "phy-m6-s1-u02": "physics-additional-m6-s1-u02", // ความร้อนและแก๊ส
    "phy-m6-s1-u03": "physics-additional-m6-s1-u03", // ของแข็งและของไหล
    "phy-m6-s2-u01": "physics-additional-m6-s2-u01", // คลื่นแม่เหล็กไฟฟ้า
    "phy-m6-s2-u02": "physics-additional-m6-s2-u02", // ฟิสิกส์อะตอม
    "phy-m6-s2-u03": "physics-additional-m6-s2-u03", // ฟิสิกส์นิวเคลียร์และฟิสิกส์อนุภาค
}

export function resolveRetiredPhysicsUnitId(unitId: string | null | undefined) {
    const normalized = unitId?.trim()
    return normalized ? RETIRED_PHYSICS_UNIT_IDS[normalized] ?? null : null
}

export function isCanonicalCoreSubjectId(value: string | null | undefined): value is CanonicalSubjectId {
    return Boolean(value && CORE_SUBJECT_OPTIONS.includes(value as CanonicalSubjectId))
}

export function parseLessonCurriculumContext(searchParams: { get(name: string): string | null }): LessonCurriculumContext {
    const subjectIdValue = searchParams.get("subjectId")?.trim() ?? ""
    const unitIdValue = searchParams.get("unitId")?.trim() ?? ""
    return {
        subjectId: isCanonicalCoreSubjectId(subjectIdValue) ? subjectIdValue : null,
        unitId: unitIdValue || null,
    }
}

export function buildLessonCurriculumHref(
    pathname: string,
    context: LessonCurriculumContext,
    extraParams?: Record<string, string | null | undefined>
) {
    const params = new URLSearchParams()
    if (context.subjectId) params.set("subjectId", context.subjectId)
    if (context.unitId) params.set("unitId", context.unitId)
    for (const [key, value] of Object.entries(extraParams ?? {})) {
        const normalized = value?.trim()
        if (normalized) params.set(key, normalized)
    }
    const query = params.toString()
    return `${pathname}${query ? `?${query}` : ""}`
}

export function resolveCanonicalSubjectId(subjectValue: string | null | undefined) {
    const normalized = subjectValue?.trim()
    if (!normalized) return null

    const canonicalMatch =
        CORE_SUBJECT_OPTIONS.find((subjectId) => {
            const option = getCanonicalSubjectById(subjectId)
            return option?.displayNameTh === normalized || option?.displayNameEn === normalized || subjectId === normalized
        }) ?? null

    return canonicalMatch
}

export function resolveCurriculumUnitTitle(subjectId: CanonicalSubjectId | null, unitId: string | null | undefined) {
    if (!subjectId || !unitId) return null
    const pack = getSubjectCurriculumMapPack(subjectId)
    return pack?.unitOutlines.find((unit) => unit.id === unitId)?.title ?? null
}

export function resolveLegacyLessonCurriculumContext(input: {
    subject: string | null | undefined
    unitId: string | null | undefined
    fallbackSubject?: string | null | undefined
}): LessonCurriculumContext {
    const rawSubject = input.subject?.trim() || input.fallbackSubject?.trim() || null
    const rawUnitId = input.unitId?.trim() || null
    const subjectId = resolveCanonicalSubjectId(rawSubject)

    if (subjectId && rawUnitId) {
        const canonicalPack = getSubjectCurriculumMapPack(subjectId)
        const canonicalUnit = canonicalPack?.unitOutlines.find((unit) => unit.id === rawUnitId)
        if (canonicalUnit) {
            return {
                subjectId,
                unitId: canonicalUnit.id,
            }
        }
    }

    // A retired phy-* id pins the subject too: lessons downgraded by the old resolver were
    // stored as science_technology, so trusting their subject would keep a physics unit
    // filed under the wrong subject.
    const retiredPhysicsUnitId = resolveRetiredPhysicsUnitId(rawUnitId)
    if (retiredPhysicsUnitId) {
        return {
            subjectId: "physics",
            unitId: retiredPhysicsUnitId,
        }
    }

    return {
        subjectId,
        unitId: null,
    }
}

export function resolveLessonCurriculumContext(content: unknown, fallbackSubject?: string | null): LessonCurriculumContext {
    if (isLessonContentV2(content)) {
        const metadata = content.metadata?.curriculum
        return resolveLegacyLessonCurriculumContext({
            subject: metadata?.subject,
            unitId: metadata?.unitId,
            fallbackSubject,
        })
    }

    return {
        subjectId: resolveCanonicalSubjectId(fallbackSubject ?? null),
        unitId: null,
    }
}
