import { z } from "zod"
import {
    ALL_CANONICAL_GRADE_BANDS,
    ALL_CANONICAL_GRADE_LEVELS,
    canonicalGradeBandSchema,
    canonicalGradeLevelSchema,
    canonicalSemesterSchema,
    canonicalSemesterModeSchema,
    type CanonicalGradeBand,
    type CanonicalGradeLevel,
    type CanonicalSemester,
    type CanonicalSemesterMode,
} from "@/lib/curriculum/grade-model"
import {
    BASIC_EDUCATION_CURRICULUM_CODE,
    curriculumSourceRefSchema,
    type CurriculumSourceRef,
} from "@/lib/curriculum/source-registry"
import {
    canonicalCoreSubjectIdSchema,
    getCanonicalSubjectById,
    type CanonicalCoreSubjectId,
} from "@/lib/curriculum/subject-catalog"

export const SUBJECT_CURRICULUM_MAP_PACK_SCHEMA_VERSION = "subject_curriculum_map_pack_v1" as const

const semesterShape = z
    .object({
        semesterMode: canonicalSemesterModeSchema,
        semester: canonicalSemesterSchema.optional(),
    })
    .superRefine((value, ctx) => {
        if (value.semesterMode === "required" && value.semester === undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "semester is required when semesterMode is required.",
                path: ["semester"],
            })
        }

        if (value.semesterMode === "not_applicable" && value.semester !== undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "semester must be omitted when semesterMode is not_applicable.",
                path: ["semester"],
            })
        }
    })

export const subjectCurriculumUnitOutlineSchema = z
    .object({
        id: z.string().trim().min(1),
        title: z.string().trim().min(1),
        order: z.number().int().min(0),
        gradeBands: z.array(canonicalGradeBandSchema).min(1),
        gradeLevels: z.array(canonicalGradeLevelSchema).min(1),
        sourceRefs: z.array(curriculumSourceRefSchema).min(1),
        notes: z.array(z.string().trim().min(1)).optional(),
    })
    .and(semesterShape)

export const subjectCurriculumMapPackSchema = z.object({
    schemaVersion: z.literal(SUBJECT_CURRICULUM_MAP_PACK_SCHEMA_VERSION),
    subjectId: canonicalCoreSubjectIdSchema,
    curriculumCode: z.literal(BASIC_EDUCATION_CURRICULUM_CODE),
    displayNameTh: z.string().trim().min(1),
    displayNameEn: z.string().trim().min(1),
    packStatus: z.enum(["starter_core_map"]),
    coverageGradeBands: z.array(canonicalGradeBandSchema).min(1),
    coverageGradeLevels: z.array(canonicalGradeLevelSchema).min(1),
    semesterMode: canonicalSemesterModeSchema,
    sourceRefs: z.array(curriculumSourceRefSchema).min(1),
    unitOutlines: z.array(subjectCurriculumUnitOutlineSchema).min(1),
})

export const subjectCurriculumMapPackCatalogSchema = z.array(subjectCurriculumMapPackSchema).min(1)

export type SubjectCurriculumUnitOutline = z.infer<typeof subjectCurriculumUnitOutlineSchema>
export type SubjectCurriculumMapPack = z.infer<typeof subjectCurriculumMapPackSchema>
export type SubjectCurriculumMapPackCatalog = z.infer<typeof subjectCurriculumMapPackCatalogSchema>

const CORE_REF = (title: string): CurriculumSourceRef => ({
    provider: "core_curriculum",
    title,
    usage: "curriculum_reference",
})

const IPST_REF = (title: string): CurriculumSourceRef => ({
    provider: "ipst",
    title,
    url: "https://www.ipst.ac.th/curriculum",
    usage: "subject_reference",
})

const PUBLISHER_REF: CurriculumSourceRef = {
    provider: "aksorn",
    title: "Teacher-facing packaging reference",
    url: "https://www.aksorn.com/store/basic-education-th",
    usage: "structure_reference",
}

const PLATFORM_REF: CurriculumSourceRef = {
    provider: "platform",
    title: "TeachPlayEdu starter unit map pack sequencing",
    usage: "platform_sequence",
}

function unique(values: string[]) {
    return new Set(values).size === values.length
}

function buildCoreUnit(
    id: string,
    title: string,
    order: number,
    notes: string[],
    gradeBands = [...ALL_CANONICAL_GRADE_BANDS] as CanonicalGradeBand[],
    gradeLevels = [...ALL_CANONICAL_GRADE_LEVELS] as CanonicalGradeLevel[],
    semesterMode: CanonicalSemesterMode = "optional",
    semester?: CanonicalSemester
): SubjectCurriculumUnitOutline {
    return {
        id,
        title,
        order,
        gradeBands,
        gradeLevels,
        semesterMode,
        semester,
        sourceRefs: [CORE_REF("Basic Education Core Curriculum structure reference"), PUBLISHER_REF, PLATFORM_REF],
        notes,
    }
}

function buildPack(
    subjectId: CanonicalCoreSubjectId,
    sourceTitle: string,
    unitOutlines: SubjectCurriculumUnitOutline[]
): SubjectCurriculumMapPack {
    const subject = getCanonicalSubjectById(subjectId)
    if (!subject) {
        throw new Error(`Missing canonical subject metadata for ${subjectId}`)
    }

    return {
        schemaVersion: SUBJECT_CURRICULUM_MAP_PACK_SCHEMA_VERSION,
        subjectId,
        curriculumCode: BASIC_EDUCATION_CURRICULUM_CODE,
        displayNameTh: subject.displayNameTh,
        displayNameEn: subject.displayNameEn,
        packStatus: "starter_core_map",
        coverageGradeBands: [...ALL_CANONICAL_GRADE_BANDS],
        coverageGradeLevels: [...ALL_CANONICAL_GRADE_LEVELS],
        semesterMode: "optional",
        sourceRefs: [CORE_REF(sourceTitle), IPST_REF("Curriculum overview reference"), PUBLISHER_REF, PLATFORM_REF],
        unitOutlines,
    }
}

export const SUBJECT_CURRICULUM_MAP_PACKS: SubjectCurriculumMapPackCatalog = [
    buildPack("thai", "Thai language learning area starter map", [
        buildCoreUnit("thai-u01", "การฟัง การดู และการพูด", 0, [
            "Use as the communication foundation block for listening, speaking, and classroom discussion.",
        ]),
        buildCoreUnit("thai-u02", "การอ่าน", 1, ["Covers reading comprehension, interpretation, and information reading."]),
        buildCoreUnit("thai-u03", "การเขียน", 2, ["Covers expressive, academic, and practical writing."]),
        buildCoreUnit("thai-u04", "หลักการใช้ภาษาไทย", 3, ["Covers grammar, usage, sentence structure, and language conventions."]),
        buildCoreUnit("thai-u05", "วรรณคดีและวรรณกรรม", 4, ["Covers literature appreciation and interpretation in age-appropriate depth."]),
    ]),
    buildPack("mathematics", "Mathematics learning area starter map", [
        buildCoreUnit("math-u01", "จำนวนและพีชคณิต", 0, ["Core number sense, algebraic thinking, and symbolic manipulation."]),
        buildCoreUnit("math-u02", "การวัดและเรขาคณิต", 1, ["Measurement, spatial reasoning, geometry, and geometric representation."]),
        buildCoreUnit("math-u03", "สถิติและความน่าจะเป็น", 2, ["Data handling, interpretation, and probability reasoning."]),
        buildCoreUnit("math-u04", "การแก้ปัญหาและการให้เหตุผล", 3, ["Cross-unit mathematical reasoning and problem-solving practices."]),
    ]),
    buildPack("science_technology", "Science and technology learning area starter map", [
        buildCoreUnit("sci-tech-u01", "วิทยาศาสตร์ชีวภาพ", 0, ["Life science concepts across organisms, ecosystems, and living systems."]),
        buildCoreUnit("sci-tech-u02", "วิทยาศาสตร์กายภาพ", 1, ["Matter, energy, force, and physical phenomena in the compulsory track."]),
        buildCoreUnit("sci-tech-u03", "โลกและอวกาศ", 2, ["Earth systems, astronomy, and space awareness in the compulsory track."]),
        buildCoreUnit("sci-tech-u04", "เทคโนโลยีและวิทยาการคำนวณ", 3, ["Design process, digital literacy, and computational thinking."]),
    ]),
    buildPack("social_religion_culture", "Social studies, religion, and culture starter map", [
        buildCoreUnit("social-u01", "ศาสนา ศีลธรรม และจริยธรรม", 0, [
            "Foundational morality, belief systems, and ethical decision-making.",
        ]),
        buildCoreUnit("social-u02", "หน้าที่พลเมือง วัฒนธรรม และการดำเนินชีวิตในสังคม", 1, [
            "Civic responsibility, community life, and cultural participation.",
        ]),
        buildCoreUnit("social-u03", "เศรษฐศาสตร์", 2, ["Economic decision-making, personal finance, and broader economic systems."]),
        buildCoreUnit("social-u04", "ประวัติศาสตร์", 3, ["Historical inquiry, chronology, and interpretation of Thai and world history."]),
        buildCoreUnit("social-u05", "ภูมิศาสตร์", 4, ["Places, environments, maps, and human-environment relationships."]),
    ]),
    buildPack("health_physical_education", "Health and physical education starter map", [
        buildCoreUnit("health-pe-u01", "การเจริญเติบโตและพัฒนาการของมนุษย์", 0, ["Human development and age-appropriate wellbeing."]),
        buildCoreUnit("health-pe-u02", "ชีวิตและครอบครัว", 1, ["Relationships, life skills, and social-emotional health."]),
        buildCoreUnit("health-pe-u03", "การเคลื่อนไหว การออกกำลังกาย เกม และกีฬา", 2, [
            "Movement skills, exercise habits, games, and sports participation.",
        ]),
        buildCoreUnit("health-pe-u04", "การสร้างเสริมสุขภาพและความปลอดภัย", 3, [
            "Personal health, prevention, safety, and healthy habits.",
        ]),
    ]),
    buildPack("arts", "Arts learning area starter map", [
        buildCoreUnit("arts-u01", "ทัศนศิลป์", 0, ["Visual art creation, appreciation, and interpretation."]),
        buildCoreUnit("arts-u02", "ดนตรี", 1, ["Music listening, performance, composition, and cultural understanding."]),
        buildCoreUnit("arts-u03", "นาฏศิลป์และการแสดง", 2, ["Dance, drama, and performance expression."]),
    ]),
    buildPack("career", "Career and work learning area starter map", [
        buildCoreUnit("career-u01", "การดำรงชีวิตและทักษะการทำงาน", 0, [
            "Daily living, responsibility, planning, and practical work habits.",
        ]),
        buildCoreUnit("career-u02", "การออกแบบและเทคโนโลยี", 1, ["Making, designing, tool use, and applied technology."]),
        buildCoreUnit("career-u03", "อาชีพและผู้ประกอบการ", 2, [
            "Career awareness, occupation pathways, and starter entrepreneurship thinking.",
        ]),
    ]),
    buildPack("foreign_languages", "Foreign languages learning area starter map", [
        buildCoreUnit("lang-u01", "ภาษาเพื่อการสื่อสาร", 0, ["Listening, speaking, reading, and writing for communication."]),
        buildCoreUnit("lang-u02", "ภาษาและวัฒนธรรม", 1, ["Intercultural awareness, conventions, and appropriate language use."]),
        buildCoreUnit("lang-u03", "ภาษากับความสัมพันธ์กับกลุ่มสาระอื่น", 2, [
            "Using language to learn and communicate across subject areas.",
        ]),
        buildCoreUnit("lang-u04", "ภาษากับความสัมพันธ์กับชุมชนและโลก", 3, [
            "Using language in real contexts, community participation, and global awareness.",
        ]),
    ]),
]

export function isSubjectCurriculumMapPack(value: unknown): value is SubjectCurriculumMapPack {
    const parsed = subjectCurriculumMapPackSchema.safeParse(value)
    if (!parsed.success) return false

    return unique(parsed.data.unitOutlines.map((unit) => unit.id))
}

export function isSubjectCurriculumMapPackCatalog(value: unknown): value is SubjectCurriculumMapPackCatalog {
    const parsed = subjectCurriculumMapPackCatalogSchema.safeParse(value)
    if (!parsed.success) return false

    return unique(parsed.data.map((pack) => pack.subjectId)) && parsed.data.every((pack) => unique(pack.unitOutlines.map((unit) => unit.id)))
}

export function validateSubjectCurriculumMapPack(value: unknown) {
    return subjectCurriculumMapPackSchema.safeParse(value)
}

export function validateSubjectCurriculumMapPackCatalog(value: unknown) {
    const parsed = subjectCurriculumMapPackCatalogSchema.safeParse(value)
    if (!parsed.success) {
        return parsed
    }

    const issues: z.ZodIssue[] = []

    if (!unique(parsed.data.map((pack) => pack.subjectId))) {
        issues.push({
            code: z.ZodIssueCode.custom,
            message: "Core subject map packs must contain unique subject ids.",
            path: [],
        })
    }

    parsed.data.forEach((pack, packIndex) => {
        if (!unique(pack.unitOutlines.map((unit) => unit.id))) {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "Each subject map pack must contain unique unit ids.",
                path: [packIndex, "unitOutlines"],
            })
        }
    })

    if (issues.length === 0) {
        return { success: true as const, data: parsed.data }
    }

    return { success: false as const, error: new z.ZodError(issues) }
}

export function getSubjectCurriculumMapPack(subjectId: CanonicalCoreSubjectId) {
    return SUBJECT_CURRICULUM_MAP_PACKS.find((pack) => pack.subjectId === subjectId) ?? null
}

export function listSubjectCurriculumUnitsForGradeBand(subjectId: CanonicalCoreSubjectId, gradeBand: CanonicalGradeBand) {
    const pack = getSubjectCurriculumMapPack(subjectId)
    if (!pack) {
        return []
    }

    return pack.unitOutlines
        .filter((unit) => unit.gradeBands.includes(gradeBand))
        .sort((left, right) => left.order - right.order)
}
