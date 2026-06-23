import { z } from "zod"
import {
    canonicalSemesterSchema,
    canonicalUpperSecondaryGradeLevelSchema,
    type CanonicalSemester,
    type CanonicalUpperSecondaryGradeLevel,
} from "@/lib/curriculum/grade-model"
import {
    curriculumSourceProviderSchema,
    curriculumSourceRefSchema,
    curriculumSourceUsageSchema,
    type CurriculumSourceRef,
} from "@/lib/curriculum/source-registry"

export const PHYSICS_CURRICULUM_CODE = "basic_education_2551_revised_2560" as const
export const PHYSICS_CURRICULUM_SCHEMA_VERSION = "physics_curriculum_map_v1" as const

export const physicsGradeLevelSchema = canonicalUpperSecondaryGradeLevelSchema
export const physicsSemesterSchema = canonicalSemesterSchema

export const physicsLearningOutcomeSchema = z.object({
    id: z.string().trim().min(1),
    text: z.string().trim().min(1),
    concepts: z.array(z.string().trim().min(1)).min(1),
    skills: z.array(z.string().trim().min(1)).min(1),
    assessmentHints: z.array(z.string().trim().min(1)).optional(),
})

export const physicsCurriculumUnitSchema = z.object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    strand: z.literal("additional_physics"),
    sourceGroup: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    order: z.number().int().min(0),
    recommendedHours: z.number().int().min(1).optional(),
    sourceRefs: z.array(curriculumSourceRefSchema).min(1),
    learningOutcomes: z.array(physicsLearningOutcomeSchema).min(2),
})

export const physicsCurriculumMapSchema = z.object({
    schemaVersion: z.literal(PHYSICS_CURRICULUM_SCHEMA_VERSION),
    subject: z.literal("physics"),
    curriculumCode: z.literal(PHYSICS_CURRICULUM_CODE),
    gradeLevel: physicsGradeLevelSchema,
    semester: physicsSemesterSchema,
    units: z.array(physicsCurriculumUnitSchema).min(1),
    sourceRefs: z.array(curriculumSourceRefSchema).min(1),
})

export const physicsCurriculumCatalogSchema = z.array(physicsCurriculumMapSchema).min(1)

export type PhysicsLearningOutcome = z.infer<typeof physicsLearningOutcomeSchema>
export type PhysicsCurriculumUnit = z.infer<typeof physicsCurriculumUnitSchema>
export type PhysicsCurriculumMap = z.infer<typeof physicsCurriculumMapSchema>
export type PhysicsCurriculumCatalog = z.infer<typeof physicsCurriculumCatalogSchema>
export type PhysicsGradeLevel = CanonicalUpperSecondaryGradeLevel
export type PhysicsSemester = CanonicalSemester

export type PhysicsCurriculumLinkSelection = {
    gradeLevel: string
    semester: number
    unitId: string
    learningOutcomeIds: string[]
}

export type PhysicsCurriculumLinkIssueCode =
    | "INVALID_SELECTION"
    | "INVALID_GRADE_LEVEL"
    | "INVALID_SEMESTER"
    | "EMPTY_UNIT_ID"
    | "EMPTY_OUTCOME_IDS"
    | "CURRICULUM_MAP_NOT_FOUND"
    | "UNIT_NOT_FOUND"
    | "DUPLICATE_OUTCOME_ID"
    | "OUTCOME_NOT_FOUND"
    | "OUTCOME_OUTSIDE_UNIT"

export type PhysicsCurriculumLinkIssue = {
    code: PhysicsCurriculumLinkIssueCode
    message: string
    unitId?: string
    learningOutcomeId?: string
}

function hasUniqueValues(values: string[]) {
    return new Set(values).size === values.length
}

function getUnitOutcomeIds(unit: PhysicsCurriculumUnit) {
    return new Set(unit.learningOutcomes.map((outcome) => outcome.id))
}

function uniqueUnitIds(units: PhysicsCurriculumUnit[]) {
    return hasUniqueValues(units.map((unit) => unit.id))
}

function uniqueOutcomeIds(units: PhysicsCurriculumUnit[]) {
    const allOutcomeIds = units.flatMap((unit) => unit.learningOutcomes.map((outcome) => outcome.id))
    return hasUniqueValues(allOutcomeIds)
}

export function isPhysicsCurriculumMap(value: unknown): value is PhysicsCurriculumMap {
    const parsed = physicsCurriculumMapSchema.safeParse(value)
    if (!parsed.success) return false

    return uniqueUnitIds(parsed.data.units) && uniqueOutcomeIds(parsed.data.units)
}

export function isPhysicsCurriculumCatalog(value: unknown): value is PhysicsCurriculumCatalog {
    const parsed = physicsCurriculumCatalogSchema.safeParse(value)
    if (!parsed.success) return false

    const maps = parsed.data
    const mapKeys = maps.map((map) => `${map.gradeLevel}:${map.semester}`)
    if (!hasUniqueValues(mapKeys)) return false

    return maps.every((map) => uniqueUnitIds(map.units) && uniqueOutcomeIds(map.units))
}

export function validatePhysicsCurriculumMap(value: unknown) {
    return physicsCurriculumMapSchema.safeParse(value)
}

export function validatePhysicsCurriculumCatalog(value: unknown) {
    return physicsCurriculumCatalogSchema.safeParse(value)
}

const sharedIpstCurriculumRef: CurriculumSourceRef = {
    provider: "ipst",
    title: "IPST Physics additional learning outcomes overview",
    url: "https://www.ipst.ac.th/physics",
    usage: "curriculum_reference",
}

const sharedIpstCurriculumPageRef: CurriculumSourceRef = {
    provider: "ipst",
    title: "IPST curriculum overview",
    url: "https://www.ipst.ac.th/curriculum",
    usage: "curriculum_reference",
}

const sharedPlatformSequenceRef: CurriculumSourceRef = {
    provider: "platform",
    title: "TeachPlayEdu physics platform sequence",
    note: "Aligned to the approved M.4-M.6 sequencing plan for the platform template pack.",
    usage: "platform_sequence",
}

function buildMap(
    gradeLevel: PhysicsGradeLevel,
    semester: PhysicsSemester,
    units: PhysicsCurriculumUnit[]
): PhysicsCurriculumMap {
    return {
        schemaVersion: PHYSICS_CURRICULUM_SCHEMA_VERSION,
        subject: "physics",
        curriculumCode: PHYSICS_CURRICULUM_CODE,
        gradeLevel,
        semester,
        units,
        sourceRefs: [sharedIpstCurriculumRef, sharedIpstCurriculumPageRef, sharedPlatformSequenceRef],
    }
}

export const PHYSICS_CURRICULUM_CATALOG: PhysicsCurriculumCatalog = [
    buildMap("m4", 1, [
        {
            id: "phy-m4-s1-u01",
            title: "ธรรมชาติและพัฒนาการทางฟิสิกส์",
            strand: "additional_physics",
            sourceGroup: 1,
            order: 0,
            recommendedHours: 6,
            sourceRefs: [sharedIpstCurriculumRef, sharedPlatformSequenceRef],
            learningOutcomes: [
                {
                    id: "phy-lo-m4-s1-u01-01",
                    text: "อธิบายธรรมชาติของฟิสิกส์ในฐานะวิชาที่ศึกษาปรากฏการณ์ธรรมชาติด้วยหลักฐาน การสังเกต การทดลอง และแบบจำลอง",
                    concepts: ["ธรรมชาติของฟิสิกส์", "หลักฐานเชิงประจักษ์", "แบบจำลองทางวิทยาศาสตร์"],
                    skills: ["อธิบาย", "จำแนก", "เชื่อมโยงตัวอย่าง"],
                    assessmentHints: ["อธิบายจากสถานการณ์", "เปรียบเทียบวิทยาศาสตร์กับความเชื่อ"],
                },
                {
                    id: "phy-lo-m4-s1-u01-02",
                    text: "อธิบายพัฒนาการขององค์ความรู้ทางฟิสิกส์และผลของเทคโนโลยีต่อการค้นพบทางฟิสิกส์",
                    concepts: ["พัฒนาการทางฟิสิกส์", "เทคโนโลยีกับการค้นพบ", "วิทยาศาสตร์กับสังคม"],
                    skills: ["เรียบเรียงลำดับเหตุการณ์", "วิเคราะห์ผลกระทบ"],
                    assessmentHints: ["timeline", "short reflection"],
                },
                {
                    id: "phy-lo-m4-s1-u01-03",
                    text: "ใช้กระบวนการทางวิทยาศาสตร์ตั้งคำถาม สมมติฐาน และแนวทางตรวจสอบได้ในบริบทฟิสิกส์เบื้องต้น",
                    concepts: ["คำถามวิทยาศาสตร์", "สมมติฐาน", "ตัวแปร"],
                    skills: ["ตั้งคำถาม", "ออกแบบการตรวจสอบ", "ระบุตัวแปร"],
                    assessmentHints: ["mini investigation plan"],
                },
            ],
        },
        {
            id: "phy-m4-s1-u02",
            title: "การเคลื่อนที่แนวตรง",
            strand: "additional_physics",
            sourceGroup: 1,
            order: 1,
            recommendedHours: 12,
            sourceRefs: [sharedIpstCurriculumRef, sharedPlatformSequenceRef],
            learningOutcomes: [
                {
                    id: "phy-lo-m4-s1-u02-01",
                    text: "อธิบายความหมายของตำแหน่ง ระยะทาง การกระจัด อัตราเร็ว ความเร็ว และความเร่งในการเคลื่อนที่แนวตรง",
                    concepts: ["ตำแหน่ง", "ระยะทาง", "การกระจัด", "ความเร็ว", "ความเร่ง"],
                    skills: ["นิยาม", "เปรียบเทียบ", "เลือกใช้ปริมาณ"],
                    assessmentHints: ["concept check", "sorting task"],
                },
                {
                    id: "phy-lo-m4-s1-u02-02",
                    text: "วิเคราะห์กราฟตำแหน่ง-เวลา กราฟความเร็ว-เวลา และเชื่อมโยงกราฟกับลักษณะการเคลื่อนที่ของวัตถุ",
                    concepts: ["กราฟการเคลื่อนที่", "ความชัน", "พื้นที่ใต้กราฟ"],
                    skills: ["อ่านกราฟ", "แปลความ", "สรุปลักษณะการเคลื่อนที่"],
                    assessmentHints: ["graph interpretation", "graph matching"],
                },
                {
                    id: "phy-lo-m4-s1-u02-03",
                    text: "คำนวณปริมาณที่เกี่ยวข้องกับการเคลื่อนที่แนวตรงในกรณีความเร็วคงตัวและความเร่งคงตัว",
                    concepts: ["สมการการเคลื่อนที่แนวตรง", "ความเร่งคงตัว"],
                    skills: ["คำนวณ", "แทนค่า", "ตรวจสอบหน่วย"],
                    assessmentHints: ["worked problem", "multi-step problem"],
                },
            ],
        },
        {
            id: "phy-m4-s1-u03",
            title: "แรงและกฎการเคลื่อนที่",
            strand: "additional_physics",
            sourceGroup: 1,
            order: 2,
            recommendedHours: 14,
            sourceRefs: [sharedIpstCurriculumRef, sharedPlatformSequenceRef],
            learningOutcomes: [
                {
                    id: "phy-lo-m4-s1-u03-01",
                    text: "อธิบายความสัมพันธ์ระหว่างแรงลัพธ์กับการเปลี่ยนสภาพการเคลื่อนที่ของวัตถุตามกฎการเคลื่อนที่ของนิวตัน",
                    concepts: ["แรงลัพธ์", "กฎของนิวตัน", "ความเฉื่อย"],
                    skills: ["อธิบายเหตุผล", "เชื่อมโยงเหตุและผล"],
                    assessmentHints: ["conceptual scenario", "explanation task"],
                },
                {
                    id: "phy-lo-m4-s1-u03-02",
                    text: "เขียนและใช้แผนภาพแรงเพื่อวิเคราะห์แรงที่กระทำต่อวัตถุในสถานการณ์ต่าง ๆ",
                    concepts: ["แรงปฏิกิริยา", "น้ำหนัก", "แรงตึงเชือก", "แรงเสียดทาน"],
                    skills: ["วาด free-body diagram", "จำแนกแรง", "วิเคราะห์ทิศทาง"],
                    assessmentHints: ["draw-and-label task"],
                },
                {
                    id: "phy-lo-m4-s1-u03-03",
                    text: "คำนวณผลของแรงต่อการเคลื่อนที่ของวัตถุในกรณีหนึ่งมิติและอธิบายคำตอบอย่างมีเหตุผล",
                    concepts: ["F=ma", "แรงเสียดทาน", "สมดุลไม่สมบูรณ์"],
                    skills: ["คำนวณ", "วิเคราะห์โจทย์", "อธิบายคำตอบ"],
                    assessmentHints: ["numeric problem with reasoning"],
                },
            ],
        },
    ]),
    buildMap("m4", 2, [
        {
            id: "phy-m4-s2-u01",
            title: "สมดุลกล",
            strand: "additional_physics",
            sourceGroup: 1,
            order: 0,
            recommendedHours: 10,
            sourceRefs: [sharedIpstCurriculumRef, sharedPlatformSequenceRef],
            learningOutcomes: [
                {
                    id: "phy-lo-m4-s2-u01-01",
                    text: "อธิบายเงื่อนไขของสมดุลต่อการเคลื่อนที่เชิงเส้นและเชิงหมุนของวัตถุ",
                    concepts: ["สมดุลของแรง", "สมดุลของโมเมนต์"],
                    skills: ["อธิบาย", "แยกกรณี", "เชื่อมโยงสถานการณ์จริง"],
                    assessmentHints: ["classify equilibrium situations"],
                },
                {
                    id: "phy-lo-m4-s2-u01-02",
                    text: "คำนวณโมเมนต์ของแรงและใช้หลักสมดุลกลแก้ปัญหาอย่างง่าย",
                    concepts: ["โมเมนต์", "จุดหมุน", "ระยะแขนของแรง"],
                    skills: ["คำนวณ", "เลือกจุดอ้างอิง", "วิเคราะห์แรงหมุน"],
                    assessmentHints: ["torque problem set"],
                },
                {
                    id: "phy-lo-m4-s2-u01-03",
                    text: "ประยุกต์หลักสมดุลกลอธิบายการทำงานของเครื่องมือและสิ่งก่อสร้างในชีวิตประจำวัน",
                    concepts: ["คาน", "สมดุลในงานวิศวกรรมเบื้องต้น"],
                    skills: ["ยกตัวอย่าง", "วิเคราะห์การใช้งานจริง"],
                    assessmentHints: ["case-based explanation"],
                },
            ],
        },
        {
            id: "phy-m4-s2-u02",
            title: "งานและพลังงาน",
            strand: "additional_physics",
            sourceGroup: 1,
            order: 1,
            recommendedHours: 12,
            sourceRefs: [sharedIpstCurriculumRef, sharedPlatformSequenceRef],
            learningOutcomes: [
                {
                    id: "phy-lo-m4-s2-u02-01",
                    text: "อธิบายความหมายของงาน กำลัง และพลังงานในบริบทของการเคลื่อนที่เชิงกล",
                    concepts: ["งาน", "กำลัง", "พลังงานจลน์", "พลังงานศักย์"],
                    skills: ["นิยาม", "เปรียบเทียบ", "เชื่อมโยงปริมาณ"],
                    assessmentHints: ["concept map"],
                },
                {
                    id: "phy-lo-m4-s2-u02-02",
                    text: "คำนวณงาน พลังงานจลน์ พลังงานศักย์ และกำลังจากสถานการณ์ที่กำหนด",
                    concepts: ["สูตรงานและพลังงาน", "หน่วยพลังงาน"],
                    skills: ["คำนวณ", "แทนค่า", "ตรวจคำตอบ"],
                    assessmentHints: ["structured problem set"],
                },
                {
                    id: "phy-lo-m4-s2-u02-03",
                    text: "ใช้กฎการอนุรักษ์พลังงานกลอธิบายและแก้ปัญหาการเคลื่อนที่ของระบบอย่างง่าย",
                    concepts: ["การอนุรักษ์พลังงาน", "การเปลี่ยนรูปพลังงาน"],
                    skills: ["วิเคราะห์ระบบ", "เลือกหลักการ", "อธิบายการเปลี่ยนรูปพลังงาน"],
                    assessmentHints: ["multi-step conservation problem"],
                },
            ],
        },
        {
            id: "phy-m4-s2-u03",
            title: "โมเมนตัมและการชน",
            strand: "additional_physics",
            sourceGroup: 1,
            order: 2,
            recommendedHours: 10,
            sourceRefs: [sharedIpstCurriculumRef, sharedPlatformSequenceRef],
            learningOutcomes: [
                {
                    id: "phy-lo-m4-s2-u03-01",
                    text: "อธิบายความหมายของอิมพัลส์และโมเมนตัมและความสัมพันธ์ระหว่างแรงกับการเปลี่ยนโมเมนตัม",
                    concepts: ["อิมพัลส์", "โมเมนตัม", "การเปลี่ยนโมเมนตัม"],
                    skills: ["อธิบาย", "เชื่อมโยงกราฟและสมการ"],
                    assessmentHints: ["explain from force-time graph"],
                },
                {
                    id: "phy-lo-m4-s2-u03-02",
                    text: "ใช้กฎการอนุรักษ์โมเมนตัมวิเคราะห์การชนในหนึ่งมิติอย่างง่าย",
                    concepts: ["ระบบปิด", "การชนยืดหยุ่น", "การชนไม่ยืดหยุ่น"],
                    skills: ["คำนวณ", "ตั้งสมการ", "วิเคราะห์ก่อน-หลังชน"],
                    assessmentHints: ["collision problem"],
                },
                {
                    id: "phy-lo-m4-s2-u03-03",
                    text: "เปรียบเทียบลักษณะการชนแต่ละแบบและอธิบายผลที่เกิดขึ้นกับพลังงานของระบบ",
                    concepts: ["พลังงานจลน์ก่อน-หลังชน"],
                    skills: ["เปรียบเทียบ", "อธิบายเชิงคุณภาพ"],
                    assessmentHints: ["comparison table"],
                },
            ],
        },
        {
            id: "phy-m4-s2-u04",
            title: "การเคลื่อนที่แนวโค้ง",
            strand: "additional_physics",
            sourceGroup: 1,
            order: 3,
            recommendedHours: 10,
            sourceRefs: [sharedIpstCurriculumRef, sharedPlatformSequenceRef],
            learningOutcomes: [
                {
                    id: "phy-lo-m4-s2-u04-01",
                    text: "อธิบายการเคลื่อนที่แบบโปรเจกไทล์โดยแยกองค์ประกอบการเคลื่อนที่ในแนวระดับและแนวดิ่ง",
                    concepts: ["โปรเจกไทล์", "การเคลื่อนที่สองมิติ", "องค์ประกอบเวกเตอร์"],
                    skills: ["แยกเวกเตอร์", "อธิบาย", "สร้างแบบจำลอง"],
                    assessmentHints: ["diagram-based explanation"],
                },
                {
                    id: "phy-lo-m4-s2-u04-02",
                    text: "คำนวณตำแหน่ง เวลา ระยะไกล และความสูงของวัตถุในการเคลื่อนที่แบบโปรเจกไทล์",
                    concepts: ["สมการโปรเจกไทล์"],
                    skills: ["คำนวณ", "ใช้สมการ", "แปลผล"],
                    assessmentHints: ["projectile problem set"],
                },
                {
                    id: "phy-lo-m4-s2-u04-03",
                    text: "ประยุกต์แนวคิดการเคลื่อนที่แนวโค้งอธิบายปรากฏการณ์หรือการออกแบบในชีวิตจริง",
                    concepts: ["มุมยิง", "วิถีการเคลื่อนที่"],
                    skills: ["ประยุกต์ใช้", "อธิบายเชิงสถานการณ์"],
                    assessmentHints: ["design or sports application"],
                },
            ],
        },
    ]),
    buildMap("m5", 1, [
        {
            id: "phy-m5-s1-u01",
            title: "การเคลื่อนที่แบบฮาร์มอนิกอย่างง่าย",
            strand: "additional_physics",
            sourceGroup: 2,
            order: 0,
            recommendedHours: 10,
            sourceRefs: [sharedIpstCurriculumRef, sharedPlatformSequenceRef],
            learningOutcomes: [
                {
                    id: "phy-lo-m5-s1-u01-01",
                    text: "อธิบายลักษณะของการสั่นและการเคลื่อนที่แบบฮาร์มอนิกอย่างง่าย",
                    concepts: ["SHM", "คาบ", "ความถี่", "แอมพลิจูด"],
                    skills: ["นิยาม", "จำแนก", "อธิบาย"],
                    assessmentHints: ["identify SHM vs non-SHM"],
                },
                {
                    id: "phy-lo-m5-s1-u01-02",
                    text: "เชื่อมโยงปริมาณที่เกี่ยวข้องกับ SHM และแปลความหมายจากกราฟการสั่น",
                    concepts: ["กราฟการสั่น", "เฟส", "ความสัมพันธ์คาบ-ความถี่"],
                    skills: ["อ่านกราฟ", "เปรียบเทียบ", "สรุป"],
                    assessmentHints: ["graph interpretation"],
                },
                {
                    id: "phy-lo-m5-s1-u01-03",
                    text: "ประยุกต์แนวคิด SHM กับระบบมวล-สปริงหรือลูกตุ้มอย่างง่าย",
                    concepts: ["ระบบมวล-สปริง", "ลูกตุ้ม"],
                    skills: ["วิเคราะห์ระบบ", "อธิบายปัจจัยที่มีผล"],
                    assessmentHints: ["simple lab or model analysis"],
                },
            ],
        },
        {
            id: "phy-m5-s1-u02",
            title: "คลื่น",
            strand: "additional_physics",
            sourceGroup: 2,
            order: 1,
            recommendedHours: 12,
            sourceRefs: [sharedIpstCurriculumRef, sharedPlatformSequenceRef],
            learningOutcomes: [
                {
                    id: "phy-lo-m5-s1-u02-01",
                    text: "อธิบายธรรมชาติของคลื่นและการส่งผ่านพลังงานโดยไม่ส่งผ่านสสารทั้งหมด",
                    concepts: ["คลื่นกล", "การส่งผ่านพลังงาน"],
                    skills: ["อธิบาย", "ยกตัวอย่าง", "เปรียบเทียบ"],
                    assessmentHints: ["concept question"],
                },
                {
                    id: "phy-lo-m5-s1-u02-02",
                    text: "ใช้ความสัมพันธ์ระหว่างอัตราเร็วคลื่น ความถี่ และความยาวคลื่นแก้ปัญหาได้",
                    concepts: ["v=fλ"],
                    skills: ["คำนวณ", "แทนค่า", "วิเคราะห์หน่วย"],
                    assessmentHints: ["calculation problem set"],
                },
                {
                    id: "phy-lo-m5-s1-u02-03",
                    text: "อธิบายและแปลความหมายปรากฏการณ์ของคลื่น เช่น การสะท้อน การหักเห การแทรกสอด และการเลี้ยวเบน",
                    concepts: ["ปรากฏการณ์ของคลื่น"],
                    skills: ["อธิบายเชิงภาพ", "เปรียบเทียบปรากฏการณ์"],
                    assessmentHints: ["waveform analysis"],
                },
            ],
        },
        {
            id: "phy-m5-s1-u03",
            title: "แสงเชิงคลื่น",
            strand: "additional_physics",
            sourceGroup: 2,
            order: 2,
            recommendedHours: 10,
            sourceRefs: [sharedIpstCurriculumRef, sharedPlatformSequenceRef],
            learningOutcomes: [
                {
                    id: "phy-lo-m5-s1-u03-01",
                    text: "อธิบายหลักฐานที่สนับสนุนว่าแสงมีสมบัติแบบคลื่น",
                    concepts: ["ธรรมชาติของแสง", "สมบัติแบบคลื่น"],
                    skills: ["อธิบาย", "เชื่อมโยงหลักฐาน"],
                    assessmentHints: ["evidence-based response"],
                },
                {
                    id: "phy-lo-m5-s1-u03-02",
                    text: "อธิบายการแทรกสอดและการเลี้ยวเบนของแสงจากสถานการณ์หรือการทดลองอย่างง่าย",
                    concepts: ["แทรกสอด", "เลี้ยวเบน"],
                    skills: ["วิเคราะห์รูปแบบ", "อธิบายผลทดลอง"],
                    assessmentHints: ["fringe pattern interpretation"],
                },
                {
                    id: "phy-lo-m5-s1-u03-03",
                    text: "ประยุกต์แนวคิดแสงเชิงคลื่นอธิบายการเกิดลวดลายหรืออุปกรณ์ที่เกี่ยวข้อง",
                    concepts: ["ความยาวคลื่นของแสง", "ปรากฏการณ์เชิงคลื่น"],
                    skills: ["ประยุกต์ใช้", "อธิบายเชิงสถานการณ์"],
                    assessmentHints: ["application short essay"],
                },
            ],
        },
        {
            id: "phy-m5-s1-u04",
            title: "แสงเชิงรังสี",
            strand: "additional_physics",
            sourceGroup: 2,
            order: 3,
            recommendedHours: 12,
            sourceRefs: [sharedIpstCurriculumRef, sharedPlatformSequenceRef],
            learningOutcomes: [
                {
                    id: "phy-lo-m5-s1-u04-01",
                    text: "ใช้กฎการสะท้อนและการหักเหอธิบายเส้นทางการเดินทางของแสงได้",
                    concepts: ["การสะท้อน", "การหักเห", "ดัชนีหักเห"],
                    skills: ["วาดรังสี", "ใช้กฎ", "อธิบาย"],
                    assessmentHints: ["ray diagram"],
                },
                {
                    id: "phy-lo-m5-s1-u04-02",
                    text: "วิเคราะห์การเกิดภาพจากกระจกและเลนส์ในสถานการณ์ต่าง ๆ",
                    concepts: ["ภาพจริง", "ภาพเสมือน", "กระจก", "เลนส์"],
                    skills: ["สร้างภาพรังสี", "วิเคราะห์ลักษณะภาพ"],
                    assessmentHints: ["image formation task"],
                },
                {
                    id: "phy-lo-m5-s1-u04-03",
                    text: "ประยุกต์แนวคิดแสงเชิงรังสีกับเครื่องมือทางทัศนศาสตร์ในชีวิตจริง",
                    concepts: ["เครื่องมือทัศนศาสตร์"],
                    skills: ["เชื่อมโยงทฤษฎีกับการใช้งาน"],
                    assessmentHints: ["device explanation"],
                },
            ],
        },
    ]),
    buildMap("m5", 2, [
        {
            id: "phy-m5-s2-u01",
            title: "เสียง",
            strand: "additional_physics",
            sourceGroup: 2,
            order: 0,
            recommendedHours: 10,
            sourceRefs: [sharedIpstCurriculumRef, sharedPlatformSequenceRef],
            learningOutcomes: [
                {
                    id: "phy-lo-m5-s2-u01-01",
                    text: "อธิบายการเกิดเสียง การเคลื่อนที่ของเสียง และการได้ยินของมนุษย์",
                    concepts: ["แหล่งกำเนิดเสียง", "คลื่นเสียง", "การได้ยิน"],
                    skills: ["อธิบาย", "เชื่อมโยงระบบ"],
                    assessmentHints: ["audio concept response"],
                },
                {
                    id: "phy-lo-m5-s2-u01-02",
                    text: "วิเคราะห์ความสัมพันธ์ของความถี่ ความเข้มเสียง และคุณภาพเสียงกับการรับรู้",
                    concepts: ["ความถี่", "ความเข้มเสียง", "คุณภาพเสียง"],
                    skills: ["เปรียบเทียบ", "แปลผลข้อมูล"],
                    assessmentHints: ["compare sound samples or charts"],
                },
                {
                    id: "phy-lo-m5-s2-u01-03",
                    text: "อธิบายปรากฏการณ์ที่เกี่ยวข้องกับเสียง เช่น การสั่นพ้อง คลื่นนิ่ง หรือดอปเพลอร์อย่างง่าย",
                    concepts: ["สั่นพ้อง", "คลื่นนิ่ง", "ดอปเพลอร์"],
                    skills: ["อธิบายปรากฏการณ์", "ยกตัวอย่าง"],
                    assessmentHints: ["scenario explanation"],
                },
            ],
        },
        {
            id: "phy-m5-s2-u02",
            title: "ไฟฟ้าสถิต",
            strand: "additional_physics",
            sourceGroup: 3,
            order: 1,
            recommendedHours: 10,
            sourceRefs: [sharedIpstCurriculumRef, sharedPlatformSequenceRef],
            learningOutcomes: [
                {
                    id: "phy-lo-m5-s2-u02-01",
                    text: "อธิบายการเกิดประจุไฟฟ้าและแรงระหว่างประจุด้วยกฎของคูลอมบ์",
                    concepts: ["ประจุไฟฟ้า", "กฎของคูลอมบ์"],
                    skills: ["อธิบาย", "คำนวณ", "เปรียบเทียบ"],
                    assessmentHints: ["Coulomb-law problem"],
                },
                {
                    id: "phy-lo-m5-s2-u02-02",
                    text: "อธิบายแนวคิดสนามไฟฟ้าและใช้แทนการอธิบายแรงที่กระทำต่อประจุ",
                    concepts: ["สนามไฟฟ้า", "เส้นสนาม"],
                    skills: ["แปลความ", "วาดภาพ", "อธิบาย"],
                    assessmentHints: ["field-line interpretation"],
                },
                {
                    id: "phy-lo-m5-s2-u02-03",
                    text: "อธิบายศักย์ไฟฟ้าและความสัมพันธ์กับพลังงานศักย์ไฟฟ้าในสถานการณ์อย่างง่าย",
                    concepts: ["ศักย์ไฟฟ้า", "พลังงานศักย์ไฟฟ้า"],
                    skills: ["เชื่อมโยงปริมาณ", "อธิบายเชิงแนวคิด"],
                    assessmentHints: ["conceptual and numeric mixed item"],
                },
            ],
        },
        {
            id: "phy-m5-s2-u03",
            title: "ไฟฟ้ากระแส",
            strand: "additional_physics",
            sourceGroup: 3,
            order: 2,
            recommendedHours: 12,
            sourceRefs: [sharedIpstCurriculumRef, sharedPlatformSequenceRef],
            learningOutcomes: [
                {
                    id: "phy-lo-m5-s2-u03-01",
                    text: "อธิบายความหมายของกระแสไฟฟ้า ความต่างศักย์ ความต้านทาน และความสัมพันธ์ตามกฎของโอห์ม",
                    concepts: ["กระแสไฟฟ้า", "ความต่างศักย์", "ความต้านทาน", "กฎของโอห์ม"],
                    skills: ["นิยาม", "เชื่อมโยง", "คำนวณ"],
                    assessmentHints: ["direct substitution and explanation"],
                },
                {
                    id: "phy-lo-m5-s2-u03-02",
                    text: "วิเคราะห์วงจรไฟฟ้ากระแสตรงอย่างง่ายทั้งแบบอนุกรมและขนาน",
                    concepts: ["วงจรอนุกรม", "วงจรขนาน"],
                    skills: ["เขียนวงจร", "วิเคราะห์", "คำนวณ"],
                    assessmentHints: ["circuit analysis"],
                },
                {
                    id: "phy-lo-m5-s2-u03-03",
                    text: "คำนวณพลังงานไฟฟ้าและกำลังไฟฟ้าและอธิบายการใช้ไฟฟ้าอย่างเหมาะสม",
                    concepts: ["พลังงานไฟฟ้า", "กำลังไฟฟ้า"],
                    skills: ["คำนวณ", "ตีความ", "ประยุกต์ใช้"],
                    assessmentHints: ["household electricity problem"],
                },
            ],
        },
    ]),
    buildMap("m6", 1, [
        {
            id: "phy-m6-s1-u01",
            title: "แม่เหล็กและไฟฟ้า",
            strand: "additional_physics",
            sourceGroup: 3,
            order: 0,
            recommendedHours: 12,
            sourceRefs: [sharedIpstCurriculumRef, sharedPlatformSequenceRef],
            learningOutcomes: [
                {
                    id: "phy-lo-m6-s1-u01-01",
                    text: "อธิบายสนามแม่เหล็กและแรงแม่เหล็กที่กระทำต่อประจุไฟฟ้าหรือกระแสไฟฟ้า",
                    concepts: ["สนามแม่เหล็ก", "แรงแม่เหล็ก"],
                    skills: ["อธิบาย", "ใช้กฎมือ", "วิเคราะห์ทิศทาง"],
                    assessmentHints: ["direction reasoning task"],
                },
                {
                    id: "phy-lo-m6-s1-u01-02",
                    text: "อธิบายการเหนี่ยวนำแม่เหล็กไฟฟ้าและความสัมพันธ์กับกฎของฟาราเดย์",
                    concepts: ["การเหนี่ยวนำแม่เหล็กไฟฟ้า", "ฟลักซ์แม่เหล็ก", "กฎของฟาราเดย์"],
                    skills: ["อธิบาย", "วิเคราะห์เหตุและผล", "แปลผลการทดลอง"],
                    assessmentHints: ["induction scenario"],
                },
                {
                    id: "phy-lo-m6-s1-u01-03",
                    text: "ประยุกต์แนวคิดแม่เหล็กและไฟฟ้าอธิบายหลักการทำงานของอุปกรณ์อย่างง่าย",
                    concepts: ["เครื่องกำเนิดไฟฟ้า", "มอเตอร์", "หม้อแปลงเบื้องต้น"],
                    skills: ["เชื่อมโยงแนวคิดกับอุปกรณ์"],
                    assessmentHints: ["device principle explanation"],
                },
            ],
        },
        {
            id: "phy-m6-s1-u02",
            title: "ความร้อนและแก๊ส",
            strand: "additional_physics",
            sourceGroup: 4,
            order: 1,
            recommendedHours: 12,
            sourceRefs: [sharedIpstCurriculumRef, sharedPlatformSequenceRef],
            learningOutcomes: [
                {
                    id: "phy-lo-m6-s1-u02-01",
                    text: "อธิบายความสัมพันธ์ระหว่างความร้อน อุณหภูมิ และการเปลี่ยนสถานะของสสาร",
                    concepts: ["ความร้อน", "อุณหภูมิ", "การเปลี่ยนสถานะ"],
                    skills: ["อธิบาย", "เปรียบเทียบ", "แปลกราฟ"],
                    assessmentHints: ["heating curve interpretation"],
                },
                {
                    id: "phy-lo-m6-s1-u02-02",
                    text: "ใช้กฎของแก๊สอธิบายและคำนวณความสัมพันธ์ของความดัน ปริมาตร และอุณหภูมิ",
                    concepts: ["กฎของแก๊ส"],
                    skills: ["คำนวณ", "ตั้งสมการ", "วิเคราะห์สถานการณ์"],
                    assessmentHints: ["gas-law problem set"],
                },
                {
                    id: "phy-lo-m6-s1-u02-03",
                    text: "อธิบายทฤษฎีจลน์ของแก๊สและเชื่อมโยงกับสมบัติระดับมหภาคของแก๊ส",
                    concepts: ["ทฤษฎีจลน์", "พลังงานภายใน"],
                    skills: ["เชื่อมโยงจุลภาค-มหภาค", "อธิบายเหตุผล"],
                    assessmentHints: ["microscopic explanation"],
                },
            ],
        },
        {
            id: "phy-m6-s1-u03",
            title: "ของแข็งและของไหล",
            strand: "additional_physics",
            sourceGroup: 4,
            order: 2,
            recommendedHours: 12,
            sourceRefs: [sharedIpstCurriculumRef, sharedPlatformSequenceRef],
            learningOutcomes: [
                {
                    id: "phy-lo-m6-s1-u03-01",
                    text: "อธิบายสมบัติเชิงกลของของแข็งและความสัมพันธ์กับการยืดหยุ่นของวัสดุ",
                    concepts: ["ความเค้น", "ความเครียด", "มอดุลัสของยัง"],
                    skills: ["อธิบาย", "คำนวณเบื้องต้น", "เปรียบเทียบวัสดุ"],
                    assessmentHints: ["material comparison task"],
                },
                {
                    id: "phy-lo-m6-s1-u03-02",
                    text: "อธิบายความดันในของไหล แรงพยุง และหลักของอาร์คิมีดีส",
                    concepts: ["ความดัน", "แรงพยุง", "อาร์คิมีดีส"],
                    skills: ["อธิบาย", "คำนวณ", "วิเคราะห์สถานการณ์"],
                    assessmentHints: ["buoyancy problem"],
                },
                {
                    id: "phy-lo-m6-s1-u03-03",
                    text: "อธิบายการไหลของของไหลโดยใช้หลักการของของไหลอุดมคติและสมการแบร์นูลลีอย่างง่าย",
                    concepts: ["อัตราการไหล", "แบร์นูลลี"],
                    skills: ["อธิบาย", "ประยุกต์ใช้", "ตีความ"],
                    assessmentHints: ["fluid application case"],
                },
            ],
        },
    ]),
    buildMap("m6", 2, [
        {
            id: "phy-m6-s2-u01",
            title: "คลื่นแม่เหล็กไฟฟ้า",
            strand: "additional_physics",
            sourceGroup: 3,
            order: 0,
            recommendedHours: 8,
            sourceRefs: [sharedIpstCurriculumRef, sharedPlatformSequenceRef],
            learningOutcomes: [
                {
                    id: "phy-lo-m6-s2-u01-01",
                    text: "อธิบายธรรมชาติและช่วงต่าง ๆ ของสเปกตรัมคลื่นแม่เหล็กไฟฟ้า",
                    concepts: ["คลื่นแม่เหล็กไฟฟ้า", "สเปกตรัม"],
                    skills: ["จำแนก", "เรียงลำดับ", "อธิบาย"],
                    assessmentHints: ["spectrum ordering"],
                },
                {
                    id: "phy-lo-m6-s2-u01-02",
                    text: "เชื่อมโยงสมบัติของคลื่นแม่เหล็กไฟฟ้ากับการใช้งานและข้อควรระวังในชีวิตประจำวัน",
                    concepts: ["พลังงาน", "ความถี่", "การใช้งาน"],
                    skills: ["วิเคราะห์การใช้งาน", "ประเมินความเหมาะสม"],
                    assessmentHints: ["real-world application chart"],
                },
            ],
        },
        {
            id: "phy-m6-s2-u02",
            title: "ฟิสิกส์อะตอม",
            strand: "additional_physics",
            sourceGroup: 4,
            order: 1,
            recommendedHours: 10,
            sourceRefs: [sharedIpstCurriculumRef, sharedPlatformSequenceRef],
            learningOutcomes: [
                {
                    id: "phy-lo-m6-s2-u02-01",
                    text: "อธิบายพัฒนาการของแบบจำลองอะตอมและข้อจำกัดของแต่ละแบบจำลอง",
                    concepts: ["แบบจำลองอะตอม", "โบร์"],
                    skills: ["เปรียบเทียบ", "อธิบายวิวัฒนาการแนวคิด"],
                    assessmentHints: ["model comparison"],
                },
                {
                    id: "phy-lo-m6-s2-u02-02",
                    text: "อธิบายปรากฏการณ์โฟโตอิเล็กทริกและความหมายต่อแนวคิดควอนตัมเบื้องต้น",
                    concepts: ["โฟตอน", "โฟโตอิเล็กทริก", "ควอนตัม"],
                    skills: ["อธิบาย", "เชื่อมโยงหลักฐานกับแนวคิด"],
                    assessmentHints: ["evidence-response item"],
                },
                {
                    id: "phy-lo-m6-s2-u02-03",
                    text: "อธิบายทวิภาวะของคลื่นและอนุภาคในระดับเบื้องต้น",
                    concepts: ["ทวิภาวะของคลื่นและอนุภาค"],
                    skills: ["อธิบายเชิงแนวคิด", "เปรียบเทียบ"],
                    assessmentHints: ["short conceptual essay"],
                },
            ],
        },
        {
            id: "phy-m6-s2-u03",
            title: "ฟิสิกส์นิวเคลียร์และฟิสิกส์อนุภาค",
            strand: "additional_physics",
            sourceGroup: 4,
            order: 2,
            recommendedHours: 10,
            sourceRefs: [sharedIpstCurriculumRef, sharedPlatformSequenceRef],
            learningOutcomes: [
                {
                    id: "phy-lo-m6-s2-u03-01",
                    text: "อธิบายกัมมันตภาพรังสี ชนิดของรังสี และผลกระทบเบื้องต้น",
                    concepts: ["กัมมันตภาพรังสี", "รังสีแอลฟา เบตา แกมมา"],
                    skills: ["จำแนก", "อธิบาย", "ประเมินความเสี่ยงเบื้องต้น"],
                    assessmentHints: ["radiation classification"],
                },
                {
                    id: "phy-lo-m6-s2-u03-02",
                    text: "อธิบายแรงนิวเคลียร์ ปฏิกิริยานิวเคลียร์ และพลังงานนิวเคลียร์อย่างเป็นเหตุผล",
                    concepts: ["แรงนิวเคลียร์", "ฟิชชัน", "ฟิวชัน"],
                    skills: ["อธิบาย", "เปรียบเทียบ", "วิเคราะห์ข้อดีข้อจำกัด"],
                    assessmentHints: ["compare fission/fusion"],
                },
                {
                    id: "phy-lo-m6-s2-u03-03",
                    text: "อธิบายภาพรวมของอนุภาคมูลฐานและการศึกษาฟิสิกส์อนุภาคในระดับมัธยมปลาย",
                    concepts: ["อนุภาคมูลฐาน", "ฟิสิกส์อนุภาค"],
                    skills: ["สรุปภาพรวม", "เชื่อมโยงกับพัฒนาการทางฟิสิกส์สมัยใหม่"],
                    assessmentHints: ["summary card or short response"],
                },
            ],
        },
    ]),
]

export function getPhysicsCurriculumMap(gradeLevel: PhysicsGradeLevel, semester: PhysicsSemester) {
    return PHYSICS_CURRICULUM_CATALOG.find((map) => map.gradeLevel === gradeLevel && map.semester === semester) ?? null
}

export function findPhysicsCurriculumUnit(
    gradeLevel: PhysicsGradeLevel,
    semester: PhysicsSemester,
    unitId: string
) {
    return getPhysicsCurriculumMap(gradeLevel, semester)?.units.find((unit) => unit.id === unitId) ?? null
}

export function findPhysicsCurriculumUnitById(unitId: string) {
    for (const map of PHYSICS_CURRICULUM_CATALOG) {
        const unit = map.units.find((item) => item.id === unitId)
        if (unit) {
            return { map, unit }
        }
    }
    return null
}

export function findPhysicsLearningOutcomesByIds(learningOutcomeIds: string[]) {
    const outcomes: PhysicsLearningOutcome[] = []

    for (const outcomeId of learningOutcomeIds) {
        for (const map of PHYSICS_CURRICULUM_CATALOG) {
            for (const unit of map.units) {
                const outcome = unit.learningOutcomes.find((item) => item.id === outcomeId)
                if (outcome) {
                    outcomes.push(outcome)
                    break
                }
            }
        }
    }

    return outcomes
}

export function findPhysicsLearningOutcome(
    gradeLevel: PhysicsGradeLevel,
    semester: PhysicsSemester,
    learningOutcomeId: string
) {
    const units = getPhysicsCurriculumMap(gradeLevel, semester)?.units ?? []
    for (const unit of units) {
        const outcome = unit.learningOutcomes.find((item) => item.id === learningOutcomeId)
        if (outcome) {
            return { unit, outcome }
        }
    }
    return null
}

export function validatePhysicsCurriculumLink(
    value: PhysicsCurriculumLinkSelection
): { ok: true; map: PhysicsCurriculumMap; unit: PhysicsCurriculumUnit } | { ok: false; issues: PhysicsCurriculumLinkIssue[] } {
    if (!value || typeof value !== "object") {
        return {
            ok: false,
            issues: [{ code: "INVALID_SELECTION", message: "Curriculum link selection must be an object." }],
        }
    }

    const issues: PhysicsCurriculumLinkIssue[] = []
    const gradeParsed = physicsGradeLevelSchema.safeParse(value.gradeLevel)
    const semesterParsed = physicsSemesterSchema.safeParse(value.semester)

    if (!gradeParsed.success) {
        issues.push({ code: "INVALID_GRADE_LEVEL", message: "gradeLevel must be m4, m5, or m6." })
    }

    if (!semesterParsed.success) {
        issues.push({ code: "INVALID_SEMESTER", message: "semester must be 1 or 2." })
    }

    if (typeof value.unitId !== "string" || value.unitId.trim().length === 0) {
        issues.push({ code: "EMPTY_UNIT_ID", message: "unitId is required." })
    }

    if (!Array.isArray(value.learningOutcomeIds) || value.learningOutcomeIds.length === 0) {
        issues.push({ code: "EMPTY_OUTCOME_IDS", message: "At least one learningOutcomeId is required." })
    }

    if (issues.length > 0 || !gradeParsed.success || !semesterParsed.success) {
        return { ok: false, issues }
    }

    const map = getPhysicsCurriculumMap(gradeParsed.data, semesterParsed.data)
    if (!map) {
        return {
            ok: false,
            issues: [
                {
                    code: "CURRICULUM_MAP_NOT_FOUND",
                    message: "No curriculum map exists for the requested gradeLevel and semester.",
                },
            ],
        }
    }

    const unit = map.units.find((item) => item.id === value.unitId)
    if (!unit) {
        return {
            ok: false,
            issues: [
                {
                    code: "UNIT_NOT_FOUND",
                    message: "unitId does not exist in the requested curriculum map.",
                    unitId: value.unitId,
                },
            ],
        }
    }

    const unitOutcomeIds = getUnitOutcomeIds(unit)
    const seenOutcomeIds = new Set<string>()
    for (const outcomeId of value.learningOutcomeIds) {
        if (typeof outcomeId !== "string" || outcomeId.trim().length === 0) {
            issues.push({
                code: "OUTCOME_NOT_FOUND",
                message: "learningOutcomeIds must contain non-empty strings.",
            })
            continue
        }

        if (seenOutcomeIds.has(outcomeId)) {
            issues.push({
                code: "DUPLICATE_OUTCOME_ID",
                message: "learningOutcomeIds must be unique.",
                learningOutcomeId: outcomeId,
            })
            continue
        }
        seenOutcomeIds.add(outcomeId)

        const found = findPhysicsLearningOutcome(gradeParsed.data, semesterParsed.data, outcomeId)
        if (!found) {
            issues.push({
                code: "OUTCOME_NOT_FOUND",
                message: "learningOutcomeId does not exist in the requested curriculum map.",
                learningOutcomeId: outcomeId,
            })
            continue
        }

        if (!unitOutcomeIds.has(outcomeId)) {
            issues.push({
                code: "OUTCOME_OUTSIDE_UNIT",
                message: "learningOutcomeId exists but belongs to a different unit.",
                unitId: value.unitId,
                learningOutcomeId: outcomeId,
            })
        }
    }

    if (issues.length > 0) {
        return { ok: false, issues }
    }

    return { ok: true, map, unit }
}
