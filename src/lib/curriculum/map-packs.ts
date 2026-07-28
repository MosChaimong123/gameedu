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
    canonicalSubjectIdSchema,
    getCanonicalSubjectById,
    type CanonicalCoreSubjectId,
    type CanonicalSubjectId,
} from "@/lib/curriculum/subject-catalog"
import {
    getCurriculumStandardById,
    getCurriculumStrandById,
} from "@/lib/curriculum/strands-and-standards"
import { PHYSICS_ADDITIONAL_UPPER_SECONDARY_COURSES } from "@/lib/curriculum/import/physics-additional-upper-secondary-source"
import { CHEM_ADDITIONAL_UPPER_SECONDARY_COURSES } from "@/lib/curriculum/import/chemistry-additional-upper-secondary-source"
import { BIO_ADDITIONAL_UPPER_SECONDARY_COURSES } from "@/lib/curriculum/import/biology-additional-upper-secondary-source"
import { EARTH_ADDITIONAL_UPPER_SECONDARY_COURSES } from "@/lib/curriculum/import/earth-space-additional-upper-secondary-source"

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
        courseType: z.enum(["core", "additional"]),
        strandId: z.string().trim().min(1),
        standardIds: z.array(z.string().trim().min(1)).min(1),
        indicatorIds: z.array(z.string().trim().min(1)).default([]),
        gradeBands: z.array(canonicalGradeBandSchema).min(1),
        gradeLevels: z.array(canonicalGradeLevelSchema).min(1),
        keyConceptTh: z.string().trim().min(1),
        competencies: z.array(z.string().trim().min(1)).min(1),
        estimatedHours: z.number().int().min(1),
        sourceRefs: z.array(curriculumSourceRefSchema).min(1),
        notes: z.array(z.string().trim().min(1)).optional(),
    })
    .and(semesterShape)

export const subjectCurriculumMapPackSchema = z.object({
    schemaVersion: z.literal(SUBJECT_CURRICULUM_MAP_PACK_SCHEMA_VERSION),
    subjectId: canonicalSubjectIdSchema,
    curriculumCode: z.literal(BASIC_EDUCATION_CURRICULUM_CODE),
    displayNameTh: z.string().trim().min(1),
    displayNameEn: z.string().trim().min(1),
    packStatus: z.enum(["starter_core_map", "starter_additional_map"]),
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
    strandId: string,
    standardIds: string[],
    keyConceptTh: string,
    competencies: string[],
    estimatedHours: number,
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
        courseType: "core",
        strandId,
        standardIds,
        indicatorIds: [],
        gradeBands,
        gradeLevels,
        keyConceptTh,
        competencies,
        estimatedHours,
        semesterMode,
        semester,
        sourceRefs: [CORE_REF("Basic Education Core Curriculum structure reference"), PUBLISHER_REF, PLATFORM_REF],
        notes,
    }
}

function buildAdditionalUnit(
    id: string,
    title: string,
    order: number,
    strandId: string,
    standardIds: string[],
    keyConceptTh: string,
    competencies: string[],
    estimatedHours: number,
    gradeLevels: CanonicalGradeLevel[],
    semester: CanonicalSemester,
    notes: string[]
): SubjectCurriculumUnitOutline {
    return {
        id,
        title,
        order,
        courseType: "additional",
        strandId,
        standardIds,
        indicatorIds: [],
        gradeBands: ["m4_m6"],
        gradeLevels,
        keyConceptTh,
        competencies,
        estimatedHours,
        semesterMode: "required",
        semester,
        sourceRefs: [IPST_REF("Additional science curriculum structure reference"), PLATFORM_REF],
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

function buildAdditionalPack(
    subjectId: CanonicalSubjectId,
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
        packStatus: "starter_additional_map",
        coverageGradeBands: ["m4_m6"],
        coverageGradeLevels: ["m4", "m5", "m6"],
        semesterMode: "required",
        sourceRefs: [IPST_REF(sourceTitle), PLATFORM_REF],
        unitOutlines,
    }
}

function resolvePhysicsStandard(courseId: string) {
    if (courseId === "physics-additional-m4-s1" || courseId === "physics-additional-m4-s2") {
        return {
            strandId: "phys-foundations-motion",
            standardIds: ["phys-p1_1"],
            keyConceptTh: "ธรรมชาติของฟิสิกส์ แรง การเคลื่อนที่ งาน พลังงาน โมเมนตัม และสมดุลกล",
        }
    }
    if (courseId === "physics-additional-m5-s1") {
        return {
            strandId: "phys-waves-light-sound",
            standardIds: ["phys-p2_1"],
            keyConceptTh: "การเคลื่อนที่แบบฮาร์มอนิก คลื่นกล เสียง แสง และการมองเห็น",
        }
    }
    if (courseId === "physics-additional-m5-s2") {
        return {
            strandId: "phys-electricity-magnetism",
            standardIds: ["phys-p3_1"],
            keyConceptTh: "แสงเชิงกายภาพ ไฟฟ้าสถิต กระแสไฟฟ้า และวงจรไฟฟ้ากระแสตรง",
        }
    }
    if (courseId === "physics-additional-m6-s1") {
        return {
            strandId: "phys-thermal-modern",
            standardIds: ["phys-p4_1"],
            keyConceptTh: "แม่เหล็กไฟฟ้า ไฟฟ้ากระแสสลับ ความร้อน แก๊ส และของไหล",
        }
    }
    return {
        strandId: "phys-thermal-modern",
        standardIds: ["phys-p4_1"],
        keyConceptTh: "คลื่นแม่เหล็กไฟฟ้า ฟิสิกส์อะตอม ฟิสิกส์นิวเคลียร์ และฟิสิกส์อนุภาค",
    }
}

function resolveChemistryStandard(courseId: string) {
    if (courseId === "chemistry-additional-m4-s1") {
        return {
            strandId: "chem-atomic-bonding",
            standardIds: ["chem-c1_1"],
            keyConceptTh: "โครงสร้างอะตอม ตารางธาตุ พันธะไอออนิก พันธะโคเวเลนต์ และพันธะโลหะ",
        }
    }
    if (courseId === "chemistry-additional-m4-s2") {
        return {
            strandId: "chem-quantitative",
            standardIds: ["chem-c2_1"],
            keyConceptTh: "มวลอะตอมและโมเลกุล ความเข้มข้นของสารละลาย และการคำนวณปริมาณสารในปฏิกิริยาเคมี",
        }
    }
    if (courseId === "chemistry-additional-m5-s1") {
        return {
            strandId: "chem-kinetics-equilibrium",
            standardIds: ["chem-c3_1"],
            keyConceptTh: "สมบัติของแก๊ส อัตราการเกิดปฏิกิริยาเคมี และภาวะสมดุลเคมี",
        }
    }
    if (courseId === "chemistry-additional-m5-s2") {
        return {
            strandId: "chem-acid-base-electro",
            standardIds: ["chem-c4_1"],
            keyConceptTh: "สมบัติของกรด-เบส ปฏิกิริยารีดอกซ์ และเซลล์ไฟฟ้าเคมี",
        }
    }
    return {
        strandId: "chem-organic-polymer",
        standardIds: ["chem-c5_1"],
        keyConceptTh: "โครงสร้างและสมบัติของสารประกอบอินทรีย์และพอลิเมอร์ รวมทั้งการนำความรู้ทางเคมีไปใช้แก้ปัญหา",
    }
}

const CHEMISTRY_ADDITIONAL_UNIT_OUTLINES: SubjectCurriculumUnitOutline[] =
    CHEM_ADDITIONAL_UPPER_SECONDARY_COURSES.flatMap((course, courseIndex) => {
        const standard = resolveChemistryStandard(course.id)
        return course.units.map((unit, unitIndex) =>
            buildAdditionalUnit(
                unit.id,
                unit.title,
                courseIndex * 10 + unitIndex,
                standard.strandId,
                standard.standardIds,
                standard.keyConceptTh,
                ["การคิดวิเคราะห์", "การแก้ปัญหา", "การใช้กระบวนการทางวิทยาศาสตร์"],
                Math.max(1, Math.round(course.hours / course.units.length)),
                [course.gradeLevel],
                course.semester,
                [`Source course: ${course.id}`, `Source file: ${course.sourceFile}`]
            )
        )
    })

function resolveBiologyStandard(courseId: string) {
    if (courseId === "biology-additional-m4-s1") {
        return {
            strandId: "bio-cell-chemistry",
            standardIds: ["bio-b1_1"],
            keyConceptTh: "ธรรมชาติของสิ่งมีชีวิต เคมีที่เป็นองค์ประกอบของเซลล์ การลำเลียงสารผ่านเซลล์ การแบ่งเซลล์ และการหายใจระดับเซลล์",
        }
    }
    if (courseId === "biology-additional-m4-s2") {
        return {
            strandId: "bio-genetics",
            standardIds: ["bio-b2_1"],
            keyConceptTh: "การถ่ายทอดลักษณะทางพันธุกรรม ยีนและโครโมโซม และเทคโนโลยีทางดีเอ็นเอ",
        }
    }
    if (courseId === "biology-additional-m5-s1") {
        return {
            strandId: "bio-plant",
            standardIds: ["bio-b3_1"],
            keyConceptTh: "โครงสร้างและหน้าที่ของพืชดอก การสังเคราะห์ด้วยแสง การสืบพันธุ์ และการตอบสนองของพืช",
        }
    }
    if (courseId === "biology-additional-m5-s2") {
        return {
            strandId: "bio-animal-physiology",
            standardIds: ["bio-b4_1"],
            keyConceptTh: "ระบบย่อยอาหาร ระบบหายใจ ระบบหมุนเวียนเลือด และระบบขับถ่ายของสัตว์",
        }
    }
    if (courseId === "biology-additional-m6-s1") {
        return {
            strandId: "bio-animal-systems",
            standardIds: ["bio-b5_1"],
            keyConceptTh: "การสืบพันธุ์และการเจริญเติบโต ระบบประสาท ระบบต่อมไร้ท่อ การเคลื่อนที่ และพฤติกรรมของสัตว์",
        }
    }
    return {
        strandId: "bio-ecology",
        standardIds: ["bio-b6_1"],
        keyConceptTh: "ความหลากหลายทางชีวภาพ ระบบนิเวศ พลวัตของประชากร และการอนุรักษ์สิ่งแวดล้อม",
    }
}

const BIOLOGY_ADDITIONAL_UNIT_OUTLINES: SubjectCurriculumUnitOutline[] =
    BIO_ADDITIONAL_UPPER_SECONDARY_COURSES.flatMap((course, courseIndex) => {
        const standard = resolveBiologyStandard(course.id)
        return course.units.map((unit, unitIndex) =>
            buildAdditionalUnit(
                unit.id,
                unit.title,
                courseIndex * 10 + unitIndex,
                standard.strandId,
                standard.standardIds,
                standard.keyConceptTh,
                ["การคิดวิเคราะห์", "การแก้ปัญหา", "การใช้กระบวนการทางวิทยาศาสตร์"],
                Math.max(1, Math.round(course.hours / course.units.length)),
                [course.gradeLevel],
                course.semester,
                [`Source course: ${course.id}`, `Source file: ${course.sourceFile}`]
            )
        )
    })

function resolveEarthSpaceStandard(courseId: string) {
    if (courseId === "earth-space-additional-m4-s1") {
        return {
            strandId: "earth-structure-tectonics",
            standardIds: ["earth-e1_1"],
            keyConceptTh: "โครงสร้างโลก ธรณีแปรสัณฐาน ธรณีพิบัติภัย และการลำดับชั้นหิน",
        }
    }
    if (courseId === "earth-space-additional-m4-s2") {
        return {
            strandId: "earth-resources-maps",
            standardIds: ["earth-e2_1"],
            keyConceptTh: "ทรัพยากรธรณีและการอ่านแปลความหมายแผนที่ภูมิประเทศและแผนที่ธรณีวิทยา",
        }
    }
    if (courseId === "earth-space-additional-m5-s1") {
        return {
            strandId: "earth-atmosphere-ocean",
            standardIds: ["earth-e3_1"],
            keyConceptTh: "องค์ประกอบของบรรยากาศ การหมุนเวียนของลม และการหมุนเวียนของน้ำในมหาสมุทร",
        }
    }
    if (courseId === "earth-space-additional-m5-s2") {
        return {
            strandId: "earth-weather-climate",
            standardIds: ["earth-e4_1"],
            keyConceptTh: "เสถียรภาพอากาศ แนวปะทะอากาศ การเปลี่ยนแปลงภูมิอากาศของโลก และการพยากรณ์อากาศ",
        }
    }
    if (courseId === "earth-space-additional-m6-s1") {
        return {
            strandId: "earth-astronomy",
            standardIds: ["earth-e5_1"],
            keyConceptTh: "กำเนิดและวิวัฒนาการของเอกภพ กาแล็กซี ดาวฤกษ์ และระบบสุริยะ",
        }
    }
    return {
        strandId: "earth-space-tech",
        standardIds: ["earth-e6_1"],
        keyConceptTh: "การระบุตำแหน่งบนทรงกลมฟ้า การเคลื่อนที่ปรากฏของดวงดาว และการประยุกต์ใช้เทคโนโลยีอวกาศ",
    }
}

const EARTH_SPACE_ADDITIONAL_UNIT_OUTLINES: SubjectCurriculumUnitOutline[] =
    EARTH_ADDITIONAL_UPPER_SECONDARY_COURSES.flatMap((course, courseIndex) => {
        const standard = resolveEarthSpaceStandard(course.id)
        return course.units.map((unit, unitIndex) =>
            buildAdditionalUnit(
                unit.id,
                unit.title,
                courseIndex * 10 + unitIndex,
                standard.strandId,
                standard.standardIds,
                standard.keyConceptTh,
                ["การคิดวิเคราะห์", "การแก้ปัญหา", "การใช้กระบวนการทางวิทยาศาสตร์"],
                Math.max(1, Math.round(course.hours / course.units.length)),
                [course.gradeLevel],
                course.semester,
                [`Source course: ${course.id}`, `Source file: ${course.sourceFile}`]
            )
        )
    })

const PHYSICS_ADDITIONAL_UNIT_OUTLINES: SubjectCurriculumUnitOutline[] =
    PHYSICS_ADDITIONAL_UPPER_SECONDARY_COURSES.flatMap((course, courseIndex) => {
        const standard = resolvePhysicsStandard(course.id)
        return course.units.map((unit, unitIndex) =>
            buildAdditionalUnit(
                unit.id,
                unit.title,
                courseIndex * 10 + unitIndex,
                standard.strandId,
                standard.standardIds,
                standard.keyConceptTh,
                ["การคิดวิเคราะห์", "การแก้ปัญหา", "การใช้กระบวนการทางวิทยาศาสตร์"],
                Math.max(1, Math.round(course.hours / course.units.length)),
                [course.gradeLevel],
                course.semester,
                [`Source course: ${course.id}`, `Source file: ${course.sourceFile}`]
            )
        )
    })

export const SUBJECT_CURRICULUM_MAP_PACKS: SubjectCurriculumMapPackCatalog = [
    buildAdditionalPack("physics", "Additional physics upper-secondary source map", PHYSICS_ADDITIONAL_UNIT_OUTLINES),
    buildAdditionalPack("chemistry", "Additional chemistry upper-secondary source map", CHEMISTRY_ADDITIONAL_UNIT_OUTLINES),
    buildAdditionalPack("biology", "Additional biology upper-secondary source map", BIOLOGY_ADDITIONAL_UNIT_OUTLINES),
    buildAdditionalPack("earth_space_science", "Additional earth-space-science upper-secondary source map", EARTH_SPACE_ADDITIONAL_UNIT_OUTLINES),
    buildPack("thai", "Thai language learning area starter map", [
        buildCoreUnit(
            "thai-u01",
            "การฟัง การดู และการพูด",
            0,
            "thai-listening-speaking",
            ["thai-th3_1"],
            "พัฒนาทักษะการฟัง ดู และพูดอย่างมีวิจารณญาณและเหมาะสมกับบริบท",
            ["การสื่อสาร", "การคิดวิเคราะห์"],
            12,
            ["Use as the communication foundation block for listening, speaking, and classroom discussion."]
        ),
        buildCoreUnit(
            "thai-u02",
            "การอ่าน",
            1,
            "thai-reading",
            ["thai-th1_1"],
            "ใช้กระบวนการอ่านเพื่อจับใจความ ตีความ และนำข้อมูลไปใช้",
            ["การสื่อสาร", "การใช้ทักษะชีวิต"],
            14,
            ["Covers reading comprehension, interpretation, and information reading."]
        ),
        buildCoreUnit(
            "thai-u03",
            "การเขียน",
            2,
            "thai-writing",
            ["thai-th2_1"],
            "ใช้กระบวนการเขียนเพื่อสื่อสารและเรียบเรียงความคิดอย่างเป็นระบบ",
            ["การสื่อสาร", "การคิดสร้างสรรค์"],
            14,
            ["Covers expressive, academic, and practical writing."]
        ),
        buildCoreUnit(
            "thai-u04",
            "หลักการใช้ภาษาไทย",
            3,
            "thai-language-use",
            ["thai-th4_1"],
            "เข้าใจธรรมชาติและหลักเกณฑ์ของภาษาไทยเพื่อใช้ภาษาได้เหมาะสม",
            ["การคิดวิเคราะห์", "การสื่อสาร"],
            12,
            ["Covers grammar, usage, sentence structure, and language conventions."]
        ),
        buildCoreUnit(
            "thai-u05",
            "วรรณคดีและวรรณกรรม",
            4,
            "thai-literature",
            ["thai-th5_1"],
            "เข้าใจคุณค่า แนวคิด และความงามทางภาษาในวรรณคดีและวรรณกรรม",
            ["การคิดวิเคราะห์", "การใช้ทักษะชีวิต"],
            12,
            ["Covers literature appreciation and interpretation in age-appropriate depth."]
        ),
    ]),
    buildPack("mathematics", "Mathematics learning area starter map", [
        buildCoreUnit(
            "math-u01",
            "จำนวนและพีชคณิต",
            0,
            "math-number-algebra",
            ["math-k1_1", "math-k1_2", "math-k1_3"],
            "เข้าใจจำนวน แบบรูป ความสัมพันธ์ และการใช้สัญลักษณ์ทางคณิตศาสตร์",
            ["การคิดวิเคราะห์", "การแก้ปัญหา"],
            16,
            ["Core number sense, algebraic thinking, and symbolic manipulation."]
        ),
        buildCoreUnit(
            "math-u02",
            "การวัดและเรขาคณิต",
            1,
            "math-measurement-geometry",
            ["math-k2_1", "math-k2_2"],
            "ใช้การวัดและเรขาคณิตเพื่ออธิบายปริมาณ รูปร่าง และความสัมพันธ์เชิงพื้นที่",
            ["การคิดวิเคราะห์", "การแก้ปัญหา"],
            16,
            ["Measurement, spatial reasoning, geometry, and geometric representation."]
        ),
        buildCoreUnit(
            "math-u03",
            "สถิติและความน่าจะเป็น",
            2,
            "math-statistics-probability",
            ["math-k3_1"],
            "รวบรวม วิเคราะห์ และแปลความหมายข้อมูลและเหตุการณ์อย่างเป็นระบบ",
            ["การคิดวิเคราะห์", "การใช้เทคโนโลยี"],
            14,
            ["Data handling, interpretation, and probability reasoning."]
        ),
        buildCoreUnit(
            "math-u04",
            "การแก้ปัญหาและการให้เหตุผล",
            3,
            "math-number-algebra",
            ["math-k1_1", "math-k1_2", "math-k1_3"],
            "ประยุกต์เหตุผลทางคณิตศาสตร์เพื่อวิเคราะห์สถานการณ์และแก้ปัญหา",
            ["การแก้ปัญหา", "การคิดวิเคราะห์"],
            12,
            ["Cross-unit mathematical reasoning and problem-solving practices."]
        ),
    ]),
    buildPack("science_technology", "Science and technology learning area starter map", [
        buildCoreUnit(
            "sci-tech-u01",
            "วิทยาศาสตร์ชีวภาพ",
            0,
            "sci-life-science",
            ["sci-w1_1", "sci-w1_2", "sci-w1_3"],
            "เข้าใจระบบสิ่งมีชีวิต ระบบนิเวศ พันธุกรรม และวิวัฒนาการ",
            ["การคิดวิเคราะห์", "การแก้ปัญหา"],
            16,
            ["Life science concepts across organisms, ecosystems, and living systems."]
        ),
        buildCoreUnit(
            "sci-tech-u02",
            "วิทยาศาสตร์กายภาพ",
            1,
            "sci-physical-science",
            ["sci-w2_1", "sci-w2_2", "sci-w2_3"],
            "เข้าใจสสาร แรง การเคลื่อนที่ พลังงาน คลื่น แสง และเสียง",
            ["การคิดวิเคราะห์", "การแก้ปัญหา"],
            18,
            ["Matter, energy, force, and physical phenomena in the compulsory track."]
        ),
        buildCoreUnit(
            "sci-tech-u02-chemistry",
            "วิทยาศาสตร์กายภาพ (เคมี)",
            1,
            "sci-physical-science",
            ["sci-w2_1"],
            "เข้าใจสมบัติของสสาร องค์ประกอบ โครงสร้าง และการเปลี่ยนแปลงทางเคมี",
            ["การคิดวิเคราะห์", "การแก้ปัญหา"],
            18,
            ["Chemistry strand — matter properties, atomic structure, and chemical change."],
            ["m4_m6"] as CanonicalGradeBand[],
            ["m5"] as CanonicalGradeLevel[]
        ),
        buildCoreUnit(
            "sci-tech-u02-physics",
            "วิทยาศาสตร์กายภาพ (ฟิสิกส์)",
            1,
            "sci-physical-science",
            ["sci-w2_2", "sci-w2_3"],
            "เข้าใจแรง การเคลื่อนที่ พลังงาน คลื่น แสง เสียง และสนามต่าง ๆ",
            ["การคิดวิเคราะห์", "การแก้ปัญหา"],
            18,
            ["Physics strand — force, motion, energy, waves, and fields."],
            ["m4_m6"] as CanonicalGradeBand[],
            ["m5"] as CanonicalGradeLevel[]
        ),
        buildCoreUnit(
            "sci-tech-u03",
            "โลกและอวกาศ",
            2,
            "sci-earth-space",
            ["sci-w3_1", "sci-w3_2"],
            "เข้าใจระบบโลก การเปลี่ยนแปลงทางธรณี และปรากฏการณ์ทางดาราศาสตร์",
            ["การคิดวิเคราะห์", "การใช้เทคโนโลยี"],
            14,
            ["Earth systems, astronomy, and space awareness in the compulsory track."]
        ),
        buildCoreUnit(
            "sci-tech-u04",
            "เทคโนโลยีและวิทยาการคำนวณ",
            3,
            "sci-technology",
            ["sci-w4_1", "sci-w4_2"],
            "ใช้แนวคิดเทคโนโลยีและเชิงคำนวณในการออกแบบและแก้ปัญหา",
            ["การแก้ปัญหา", "การใช้เทคโนโลยี"],
            14,
            ["Design process, digital literacy, and computational thinking."]
        ),
    ]),
    buildPack("social_religion_culture", "Social studies, religion, and culture starter map", [
        buildCoreUnit(
            "social-u01",
            "ศาสนา ศีลธรรม จริยธรรม",
            0,
            "social-religion-morality",
            ["social-s1_1", "social-s1_2"],
            "เข้าใจหลักศาสนา คุณธรรม และการนำไปใช้ในการดำเนินชีวิต",
            ["การใช้ทักษะชีวิต", "การคิดวิเคราะห์"],
            12,
            ["Foundational morality, belief systems, and ethical decision-making."]
        ),
        buildCoreUnit(
            "social-u02",
            "หน้าที่พลเมือง วัฒนธรรม และการดำเนินชีวิตในสังคม",
            1,
            "social-civics-culture",
            ["social-s2_1", "social-s2_2"],
            "เข้าใจบทบาทพลเมือง วัฒนธรรม และการอยู่ร่วมกันในสังคมประชาธิปไตย",
            ["การใช้ทักษะชีวิต", "การสื่อสาร"],
            14,
            ["Civic responsibility, community life, and cultural participation."]
        ),
        buildCoreUnit(
            "social-u03",
            "เศรษฐศาสตร์",
            2,
            "social-economics",
            ["social-s3_1", "social-s3_2"],
            "เข้าใจระบบเศรษฐกิจ การผลิต การบริโภค และการตัดสินใจทางเศรษฐกิจ",
            ["การคิดวิเคราะห์", "การใช้ทักษะชีวิต"],
            12,
            ["Economic decision-making, personal finance, and broader economic systems."]
        ),
        buildCoreUnit(
            "social-u04",
            "ประวัติศาสตร์",
            3,
            "social-history",
            ["social-s4_1", "social-s4_2"],
            "ใช้วิธีการทางประวัติศาสตร์เพื่อเข้าใจความเปลี่ยนแปลงของมนุษยชาติ",
            ["การคิดวิเคราะห์", "การสื่อสาร"],
            12,
            ["Historical inquiry, chronology, and interpretation of Thai and world history."]
        ),
        buildCoreUnit(
            "social-u05",
            "ภูมิศาสตร์",
            4,
            "social-geography",
            ["social-s5_1", "social-s5_2"],
            "เข้าใจลักษณะทางกายภาพของโลกและความสัมพันธ์ระหว่างมนุษย์กับสิ่งแวดล้อม",
            ["การคิดวิเคราะห์", "การใช้เทคโนโลยี"],
            12,
            ["Places, environments, maps, and human-environment relationships."]
        ),
    ]),
    buildPack("health_physical_education", "Health and physical education starter map", [
        buildCoreUnit(
            "health-pe-u01",
            "การเจริญเติบโตและพัฒนาการของมนุษย์",
            0,
            "health-human-development",
            ["health-p1_1"],
            "เข้าใจการเจริญเติบโตและพัฒนาการที่เหมาะสมตามวัย",
            ["การใช้ทักษะชีวิต", "การคิดวิเคราะห์"],
            10,
            ["Human development and age-appropriate wellbeing."]
        ),
        buildCoreUnit(
            "health-pe-u02",
            "ชีวิตและครอบครัว",
            1,
            "health-life-family",
            ["health-p2_1"],
            "เห็นคุณค่าตนเอง ครอบครัว และมีทักษะในการดำเนินชีวิต",
            ["การใช้ทักษะชีวิต", "การสื่อสาร"],
            10,
            ["Relationships, life skills, and social-emotional health."]
        ),
        buildCoreUnit(
            "health-pe-u03",
            "การเคลื่อนไหว การออกกำลังกาย เกม และกีฬา",
            2,
            "health-movement-exercise-sport",
            ["health-p3_1"],
            "พัฒนาทักษะการเคลื่อนไหว ออกกำลังกาย และการเล่นกีฬา",
            ["การใช้ทักษะชีวิต", "การแก้ปัญหา"],
            12,
            ["Movement skills, exercise habits, games, and sports participation."]
        ),
        buildCoreUnit(
            "health-pe-u04",
            "การสร้างเสริมสุขภาพและความปลอดภัย",
            3,
            "health-health-promotion",
            ["health-p4_1"],
            "สร้างเสริมสุขภาพ ป้องกันโรค และดูแลตนเองอย่างปลอดภัย",
            ["การใช้ทักษะชีวิต", "การคิดวิเคราะห์"],
            12,
            ["Personal health, prevention, safety, and healthy habits."]
        ),
    ]),
    buildPack("arts", "Arts learning area starter map", [
        buildCoreUnit(
            "arts-u01",
            "ทัศนศิลป์",
            0,
            "arts-visual-art",
            ["arts-s1_1"],
            "สร้างสรรค์และวิจารณ์งานทัศนศิลป์อย่างมีความหมาย",
            ["การคิดสร้างสรรค์", "การสื่อสาร"],
            12,
            ["Visual art creation, appreciation, and interpretation."]
        ),
        buildCoreUnit(
            "arts-u02",
            "ดนตรี",
            1,
            "arts-music",
            ["arts-s2_1"],
            "เข้าใจองค์ประกอบดนตรีและแสดงออกทางดนตรีอย่างสร้างสรรค์",
            ["การคิดสร้างสรรค์", "การสื่อสาร"],
            12,
            ["Music listening, performance, composition, and cultural understanding."]
        ),
        buildCoreUnit(
            "arts-u03",
            "นาฏศิลป์และการแสดง",
            2,
            "arts-performance",
            ["arts-s3_1"],
            "แสดงออกผ่านนาฏศิลป์และการแสดงอย่างมีความหมายและเหมาะสม",
            ["การคิดสร้างสรรค์", "การสื่อสาร"],
            12,
            ["Dance, drama, and performance expression."]
        ),
    ]),
    buildPack("career", "Career and work learning area starter map", [
        buildCoreUnit(
            "career-u01",
            "การดำรงชีวิตและทักษะการทำงาน",
            0,
            "career-work-living",
            ["career-ng1_1"],
            "มีทักษะการทำงาน การจัดการ และคุณธรรมในการทำงาน",
            ["การใช้ทักษะชีวิต", "การแก้ปัญหา"],
            14,
            ["Daily living, responsibility, planning, and practical work habits."]
        ),
        buildCoreUnit(
            "career-u02",
            "การออกแบบและเทคโนโลยี",
            1,
            "career-work-living",
            ["career-ng1_1"],
            "ออกแบบ ลงมือปฏิบัติ และใช้เทคโนโลยีอย่างเหมาะสมกับงาน",
            ["การแก้ปัญหา", "การใช้เทคโนโลยี"],
            12,
            ["Making, designing, tool use, and applied technology."]
        ),
        buildCoreUnit(
            "career-u03",
            "อาชีพและผู้ประกอบการ",
            2,
            "career-work-living",
            ["career-ng1_1"],
            "สำรวจอาชีพ วางแผนเส้นทาง และพัฒนาความรับผิดชอบต่อการทำงาน",
            ["การใช้ทักษะชีวิต", "การคิดวิเคราะห์"],
            12,
            ["Career awareness, occupation pathways, and starter entrepreneurship thinking."]
        ),
    ]),
    buildPack("foreign_languages", "Foreign languages learning area starter map", [
        buildCoreUnit(
            "lang-u01",
            "ภาษาเพื่อการสื่อสาร",
            0,
            "lang-communication",
            ["lang-t1_1", "lang-t1_2", "lang-t1_3"],
            "ใช้ภาษาต่างประเทศเพื่อฟัง พูด อ่าน เขียน และนำเสนอข้อมูล",
            ["การสื่อสาร", "การคิดวิเคราะห์"],
            16,
            ["Listening, speaking, reading, and writing for communication."]
        ),
        buildCoreUnit(
            "lang-u02",
            "ภาษาและวัฒนธรรม",
            1,
            "lang-culture",
            ["lang-t2_1", "lang-t2_2"],
            "เข้าใจความสัมพันธ์ระหว่างภาษาและวัฒนธรรมอย่างเหมาะสม",
            ["การสื่อสาร", "การใช้ทักษะชีวิต"],
            12,
            ["Intercultural awareness, conventions, and appropriate language use."]
        ),
        buildCoreUnit(
            "lang-u03",
            "ภาษากับความสัมพันธ์กับกลุ่มสาระอื่น",
            2,
            "lang-other-subjects",
            ["lang-t3_1"],
            "ใช้ภาษาต่างประเทศเป็นเครื่องมือในการเรียนรู้ข้ามกลุ่มสาระ",
            ["การสื่อสาร", "การใช้เทคโนโลยี"],
            10,
            ["Using language to learn and communicate across subject areas."]
        ),
        buildCoreUnit(
            "lang-u04",
            "ภาษากับความสัมพันธ์กับชุมชนและโลก",
            3,
            "lang-community-world",
            ["lang-t4_1", "lang-t4_2"],
            "ใช้ภาษาต่างประเทศในชุมชน การศึกษาต่อ อาชีพ และการสื่อสารระดับโลก",
            ["การสื่อสาร", "การใช้ทักษะชีวิต"],
            12,
            ["Using language in real contexts, community participation, and global awareness."]
        ),
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

    return (
        unique(parsed.data.map((pack) => pack.subjectId)) &&
        parsed.data.every((pack) => unique(pack.unitOutlines.map((unit) => unit.id)))
    )
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

        pack.unitOutlines.forEach((unit, unitIndex) => {
            const strand = getCurriculumStrandById(unit.strandId)
            if (!strand) {
                issues.push({
                    code: z.ZodIssueCode.custom,
                    message: "Unit strandId must reference an existing curriculum strand.",
                    path: [packIndex, "unitOutlines", unitIndex, "strandId"],
                })
                return
            }

            if (strand.subjectId !== pack.subjectId) {
                issues.push({
                    code: z.ZodIssueCode.custom,
                    message: "Unit strandId must belong to the same subject as the pack.",
                    path: [packIndex, "unitOutlines", unitIndex, "strandId"],
                })
            }

            unit.standardIds.forEach((standardId, standardIndex) => {
                const standard = getCurriculumStandardById(standardId)
                if (!standard) {
                    issues.push({
                        code: z.ZodIssueCode.custom,
                        message: "Unit standardIds must reference existing curriculum standards.",
                        path: [packIndex, "unitOutlines", unitIndex, "standardIds", standardIndex],
                    })
                    return
                }

                if (standard.subjectId !== pack.subjectId) {
                    issues.push({
                        code: z.ZodIssueCode.custom,
                        message: "Unit standardIds must not cross subjects.",
                        path: [packIndex, "unitOutlines", unitIndex, "standardIds", standardIndex],
                    })
                }
            })
        })
    })

    if (issues.length === 0) {
        return { success: true as const, data: parsed.data }
    }

    return { success: false as const, error: new z.ZodError(issues) }
}

export function getSubjectCurriculumMapPack(subjectId: CanonicalSubjectId) {
    return SUBJECT_CURRICULUM_MAP_PACKS.find((pack) => pack.subjectId === subjectId) ?? null
}

export function getSubjectCurriculumUnitById(subjectId: CanonicalSubjectId, unitId: string) {
    return getSubjectCurriculumMapPack(subjectId)?.unitOutlines.find((unit) => unit.id === unitId) ?? null
}

export function listSubjectCurriculumUnitsForGradeBand(subjectId: CanonicalSubjectId, gradeBand: CanonicalGradeBand) {
    const pack = getSubjectCurriculumMapPack(subjectId)
    if (!pack) {
        return []
    }

    return pack.unitOutlines
        .filter((unit) => unit.gradeBands.includes(gradeBand))
        .sort((left, right) => left.order - right.order)
}

export function listSubjectCurriculumUnitsForGradeLevel(
    subjectId: CanonicalSubjectId,
    gradeLevel: CanonicalGradeLevel
) {
    const pack = getSubjectCurriculumMapPack(subjectId)
    if (!pack) {
        return []
    }

    return pack.unitOutlines
        .filter((unit) => unit.gradeLevels.includes(gradeLevel))
        .sort((left, right) => left.order - right.order)
}

export function listSubjectCurriculumUnitsByCurriculumSelection(input: {
    subjectId: CanonicalSubjectId
    gradeLevel?: CanonicalGradeLevel | null
    strandId?: string | null
    standardId?: string | null
}) {
    const pack = getSubjectCurriculumMapPack(input.subjectId)
    if (!pack) {
        return []
    }

    return pack.unitOutlines
        .filter((unit) => {
            if (input.gradeLevel && !unit.gradeLevels.includes(input.gradeLevel)) {
                return false
            }

            if (input.strandId && unit.strandId !== input.strandId) {
                return false
            }

            if (input.standardId && !unit.standardIds.includes(input.standardId)) {
                return false
            }

            return true
        })
        .sort((left, right) => left.order - right.order)
}
