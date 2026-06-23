import { z } from "zod"
import { curriculumSourceRefSchema, type CurriculumSourceRef } from "@/lib/curriculum/source-registry"
import {
    getSubjectCurriculumMapPack,
    type SubjectCurriculumUnitOutline,
} from "@/lib/curriculum/map-packs"
import { canonicalCoreSubjectIdSchema, type CanonicalCoreSubjectId } from "@/lib/curriculum/subject-catalog"

export const SUBJECT_UNIT_OUTCOME_CATALOG_SCHEMA_VERSION = "subject_unit_outcome_catalog_v1" as const

export const subjectUnitTopicSchema = z.object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    notes: z.array(z.string().trim().min(1)).optional(),
})

export const subjectUnitCrosswalkRulesSchema = z.object({
    sameSubjectOnly: z.boolean(),
    sameUnitOnly: z.boolean(),
    minPrimaryOutcomeCount: z.number().int().min(1),
    allowSupportingOutcomes: z.boolean(),
    allowTeacherOverride: z.boolean(),
})

export const subjectUnitLearningOutcomeSchema = z.object({
    id: z.string().trim().min(1),
    text: z.string().trim().min(1),
    concepts: z.array(z.string().trim().min(1)).min(1),
    skills: z.array(z.string().trim().min(1)).min(1),
    topicIds: z.array(z.string().trim().min(1)).min(1),
    assessmentHints: z.array(z.string().trim().min(1)).optional(),
    sourceRefs: z.array(curriculumSourceRefSchema).min(1),
})

export const subjectUnitLearningOutcomePackSchema = z.object({
    schemaVersion: z.literal(SUBJECT_UNIT_OUTCOME_CATALOG_SCHEMA_VERSION),
    subjectId: canonicalCoreSubjectIdSchema,
    unitId: z.string().trim().min(1),
    unitTitle: z.string().trim().min(1),
    topics: z.array(subjectUnitTopicSchema).min(1),
    learningOutcomes: z.array(subjectUnitLearningOutcomeSchema).min(2),
    crosswalkRules: subjectUnitCrosswalkRulesSchema,
})

export const subjectUnitLearningOutcomeCatalogSchema = z.array(subjectUnitLearningOutcomePackSchema).min(1)

export type SubjectUnitTopic = z.infer<typeof subjectUnitTopicSchema>
export type SubjectUnitCrosswalkRules = z.infer<typeof subjectUnitCrosswalkRulesSchema>
export type SubjectUnitLearningOutcome = z.infer<typeof subjectUnitLearningOutcomeSchema>
export type SubjectUnitLearningOutcomePack = z.infer<typeof subjectUnitLearningOutcomePackSchema>
export type SubjectUnitLearningOutcomeCatalog = z.infer<typeof subjectUnitLearningOutcomeCatalogSchema>

export type SubjectUnitOutcomeSelection = {
    subjectId: string
    unitId: string
    primaryOutcomeId: string
    supportingOutcomeIds?: string[]
}

export type SubjectUnitOutcomeSelectionIssueCode =
    | "INVALID_SUBJECT_ID"
    | "PACK_NOT_FOUND"
    | "UNIT_NOT_FOUND"
    | "EMPTY_PRIMARY_OUTCOME_ID"
    | "PRIMARY_OUTCOME_NOT_FOUND"
    | "PRIMARY_OUTCOME_OUTSIDE_UNIT"
    | "SUPPORTING_OUTCOME_NOT_FOUND"
    | "SUPPORTING_OUTCOME_OUTSIDE_UNIT"
    | "DUPLICATE_SUPPORTING_OUTCOME_ID"

export type SubjectUnitOutcomeSelectionIssue = {
    code: SubjectUnitOutcomeSelectionIssueCode
    message: string
    outcomeId?: string
    unitId?: string
}

const OUTCOME_SOURCE_REF: CurriculumSourceRef = {
    provider: "platform",
    title: "TeachPlayEdu subject unit outcome starter pack",
    usage: "platform_sequence",
}

function unique(values: string[]) {
    return new Set(values).size === values.length
}

function getUnitOutlineOrThrow(subjectId: CanonicalCoreSubjectId, unitId: string): SubjectCurriculumUnitOutline {
    const pack = getSubjectCurriculumMapPack(subjectId)
    if (!pack) {
        throw new Error(`Missing subject curriculum pack for ${subjectId}`)
    }

    const unit = pack.unitOutlines.find((entry) => entry.id === unitId)
    if (!unit) {
        throw new Error(`Missing unit ${unitId} in subject curriculum pack ${subjectId}`)
    }

    return unit
}

function buildTopic(id: string, title: string, notes?: string[]): SubjectUnitTopic {
    return { id, title, notes }
}

function buildOutcome(
    id: string,
    text: string,
    concepts: string[],
    skills: string[],
    topicIds: string[],
    assessmentHints: string[]
): SubjectUnitLearningOutcome {
    return {
        id,
        text,
        concepts,
        skills,
        topicIds,
        assessmentHints,
        sourceRefs: [OUTCOME_SOURCE_REF],
    }
}

function buildOutcomePack(
    subjectId: CanonicalCoreSubjectId,
    unitId: string,
    topics: SubjectUnitTopic[],
    learningOutcomes: SubjectUnitLearningOutcome[]
): SubjectUnitLearningOutcomePack {
    const unit = getUnitOutlineOrThrow(subjectId, unitId)

    return {
        schemaVersion: SUBJECT_UNIT_OUTCOME_CATALOG_SCHEMA_VERSION,
        subjectId,
        unitId,
        unitTitle: unit.title,
        topics,
        learningOutcomes,
        crosswalkRules: {
            sameSubjectOnly: true,
            sameUnitOnly: true,
            minPrimaryOutcomeCount: 1,
            allowSupportingOutcomes: true,
            allowTeacherOverride: true,
        },
    }
}

export const SUBJECT_UNIT_LEARNING_OUTCOME_CATALOG: SubjectUnitLearningOutcomeCatalog = [
    buildOutcomePack("thai", "thai-u01", [
        buildTopic("thai-u01-t01", "การฟังและจับใจความ"),
        buildTopic("thai-u01-t02", "การพูดสื่อสารและอภิปราย"),
    ], [
        buildOutcome(
            "thai-lo-u01-01",
            "จับใจความสำคัญจากการฟังหรือการดูสื่อ และอธิบายสาระสำคัญด้วยภาษาของตนเองได้",
            ["ใจความสำคัญ", "การฟังอย่างมีวิจารณญาณ"],
            ["จับใจความ", "สรุปความ"],
            ["thai-u01-t01"],
            ["listening summary", "main-idea response"]
        ),
        buildOutcome(
            "thai-lo-u01-02",
            "พูดสื่อสาร อภิปราย หรือแสดงความคิดเห็นอย่างเหมาะสมกับบริบทและผู้ฟังได้",
            ["การสื่อสาร", "มารยาทในการพูด"],
            ["พูดนำเสนอ", "อภิปราย", "ให้เหตุผล"],
            ["thai-u01-t02"],
            ["oral presentation", "discussion rubric"]
        ),
    ]),
    buildOutcomePack("thai", "thai-u02", [
        buildTopic("thai-u02-t01", "อ่านจับใจความ"),
        buildTopic("thai-u02-t02", "อ่านตีความและอ่านเพื่อใช้ข้อมูล"),
    ], [
        buildOutcome(
            "thai-lo-u02-01",
            "อ่านเรื่องหรือข้อความแล้วระบุใจความสำคัญ รายละเอียดสนับสนุน และจุดประสงค์ของผู้เขียนได้",
            ["ใจความสำคัญ", "จุดประสงค์ของผู้เขียน"],
            ["อ่านจับใจความ", "จำแนกข้อมูล"],
            ["thai-u02-t01"],
            ["reading comprehension", "main-detail sort"]
        ),
        buildOutcome(
            "thai-lo-u02-02",
            "ตีความข้อมูลจากบทอ่านและนำไปใช้ตอบคำถามหรือแก้ปัญหาในบริบทใหม่ได้",
            ["การตีความ", "การอ่านเพื่อใช้ข้อมูล"],
            ["ตีความ", "เชื่อมโยงข้อมูล"],
            ["thai-u02-t02"],
            ["applied reading task", "evidence-based response"]
        ),
    ]),
    buildOutcomePack("thai", "thai-u03", [
        buildTopic("thai-u03-t01", "เขียนสื่อสาร"),
        buildTopic("thai-u03-t02", "เขียนเรียบเรียงอย่างมีโครงสร้าง"),
    ], [
        buildOutcome(
            "thai-lo-u03-01",
            "เขียนสื่อสารข้อมูล ความคิดเห็น หรือประสบการณ์ของตนเองได้ชัดเจนและเหมาะสมกับวัตถุประสงค์",
            ["การเขียนสื่อสาร", "วัตถุประสงค์ของงานเขียน"],
            ["เขียนสื่อสาร", "เลือกภาษาเหมาะสม"],
            ["thai-u03-t01"],
            ["short writing task", "purpose-and-audience rubric"]
        ),
        buildOutcome(
            "thai-lo-u03-02",
            "เรียบเรียงงานเขียนให้มีลำดับความคิด บทนำ เนื้อเรื่อง และสรุปที่สัมพันธ์กันได้",
            ["โครงสร้างงานเขียน", "ความต่อเนื่องของความคิด"],
            ["เรียบเรียง", "ตรวจทาน"],
            ["thai-u03-t02"],
            ["paragraph organization", "revision checklist"]
        ),
    ]),
    buildOutcomePack("thai", "thai-u04", [
        buildTopic("thai-u04-t01", "คำและประโยค"),
        buildTopic("thai-u04-t02", "หลักการใช้ภาษาให้ถูกต้อง"),
    ], [
        buildOutcome(
            "thai-lo-u04-01",
            "ใช้คำ ประโยค และโครงสร้างภาษาไทยได้ถูกต้องตามหลักภาษาในระดับที่เหมาะสม",
            ["ชนิดของคำ", "โครงสร้างประโยค"],
            ["ใช้ภาษา", "ตรวจความถูกต้อง"],
            ["thai-u04-t01"],
            ["editing task", "sentence correction"]
        ),
        buildOutcome(
            "thai-lo-u04-02",
            "ปรับภาษาให้เหมาะกับบริบททางการและไม่เป็นทางการได้",
            ["ระดับภาษา", "ความเหมาะสมของภาษา"],
            ["เลือกใช้ภาษา", "เปรียบเทียบบริบท"],
            ["thai-u04-t02"],
            ["register matching", "rewrite for audience"]
        ),
    ]),
    buildOutcomePack("thai", "thai-u05", [
        buildTopic("thai-u05-t01", "อ่านวรรณคดี"),
        buildTopic("thai-u05-t02", "ตีความคุณค่าและแนวคิด"),
    ], [
        buildOutcome(
            "thai-lo-u05-01",
            "อธิบายเนื้อหา ตัวละคร เหตุการณ์ หรือแนวคิดสำคัญจากวรรณคดีและวรรณกรรมได้",
            ["วรรณคดี", "องค์ประกอบของเรื่อง"],
            ["สรุปเรื่อง", "อธิบายแนวคิด"],
            ["thai-u05-t01"],
            ["literature response", "character/event map"]
        ),
        buildOutcome(
            "thai-lo-u05-02",
            "ตีความคุณค่า ข้อคิด หรือความงามทางภาษาในวรรณคดีและวรรณกรรมได้",
            ["คุณค่าทางวรรณศิลป์", "ข้อคิดจากเรื่อง"],
            ["ตีความ", "ให้เหตุผลจากข้อความ"],
            ["thai-u05-t02"],
            ["interpretive response", "quote-supported explanation"]
        ),
    ]),

    buildOutcomePack("mathematics", "math-u01", [
        buildTopic("math-u01-t01", "จำนวนและความสัมพันธ์"),
        buildTopic("math-u01-t02", "นิพจน์ สมการ และแบบรูป"),
    ], [
        buildOutcome(
            "math-lo-u01-01",
            "ใช้ความเข้าใจเรื่องจำนวนและความสัมพันธ์ของจำนวนในการวิเคราะห์และแก้ปัญหาได้",
            ["จำนวน", "ความสัมพันธ์ของจำนวน"],
            ["คำนวณ", "วิเคราะห์โจทย์"],
            ["math-u01-t01"],
            ["number reasoning task", "multi-step problem"]
        ),
        buildOutcome(
            "math-lo-u01-02",
            "สร้างและใช้สมการหรือแบบรูปแทนสถานการณ์ทางคณิตศาสตร์ได้",
            ["สมการ", "แบบรูป", "พีชคณิต"],
            ["แทนค่าด้วยสัญลักษณ์", "แก้สมการ"],
            ["math-u01-t02"],
            ["equation modeling", "pattern extension"]
        ),
    ]),
    buildOutcomePack("mathematics", "math-u02", [
        buildTopic("math-u02-t01", "การวัด"),
        buildTopic("math-u02-t02", "รูปเรขาคณิตและมิติสัมพันธ์"),
    ], [
        buildOutcome(
            "math-lo-u02-01",
            "เลือกใช้หน่วยและวิธีการวัดที่เหมาะสม พร้อมอธิบายผลการวัดได้",
            ["การวัด", "หน่วย", "ความแม่นยำ"],
            ["วัด", "เลือกหน่วย", "อธิบายผล"],
            ["math-u02-t01"],
            ["measurement task", "unit selection check"]
        ),
        buildOutcome(
            "math-lo-u02-02",
            "วิเคราะห์สมบัติของรูปเรขาคณิตและใช้เหตุผลเชิงพื้นที่ในการแก้ปัญหาได้",
            ["รูปเรขาคณิต", "มิติสัมพันธ์"],
            ["วาดภาพ", "ให้เหตุผลเชิงเรขาคณิต"],
            ["math-u02-t02"],
            ["geometry proof-lite", "spatial reasoning task"]
        ),
    ]),
    buildOutcomePack("mathematics", "math-u03", [
        buildTopic("math-u03-t01", "การเก็บและนำเสนอข้อมูล"),
        buildTopic("math-u03-t02", "ความน่าจะเป็นเบื้องต้น"),
    ], [
        buildOutcome(
            "math-lo-u03-01",
            "อ่าน วิเคราะห์ และตีความข้อมูลจากตาราง กราฟ หรือแผนภาพได้",
            ["ข้อมูล", "การนำเสนอข้อมูล"],
            ["อ่านกราฟ", "ตีความข้อมูล"],
            ["math-u03-t01"],
            ["graph interpretation", "data summary"]
        ),
        buildOutcome(
            "math-lo-u03-02",
            "ใช้แนวคิดความน่าจะเป็นอธิบายเหตุการณ์และเปรียบเทียบโอกาสเกิดเหตุการณ์ได้",
            ["ความน่าจะเป็น", "เหตุการณ์"],
            ["คาดการณ์", "เปรียบเทียบโอกาส"],
            ["math-u03-t02"],
            ["probability comparison", "event reasoning"]
        ),
    ]),
    buildOutcomePack("mathematics", "math-u04", [
        buildTopic("math-u04-t01", "วิเคราะห์ปัญหา"),
        buildTopic("math-u04-t02", "อธิบายวิธีคิด"),
    ], [
        buildOutcome(
            "math-lo-u04-01",
            "วิเคราะห์ปัญหาทางคณิตศาสตร์และเลือกวิธีแก้ปัญหาที่เหมาะสมได้",
            ["การแก้ปัญหา", "กลยุทธ์ทางคณิตศาสตร์"],
            ["วิเคราะห์", "เลือกวิธีการ"],
            ["math-u04-t01"],
            ["strategy selection", "open problem"]
        ),
        buildOutcome(
            "math-lo-u04-02",
            "อธิบายเหตุผลและตรวจสอบความสมเหตุสมผลของคำตอบทางคณิตศาสตร์ได้",
            ["เหตุผลทางคณิตศาสตร์", "ความสมเหตุสมผล"],
            ["อธิบายวิธีคิด", "ตรวจคำตอบ"],
            ["math-u04-t02"],
            ["show-your-work rubric", "error analysis"]
        ),
    ]),

    buildOutcomePack("science_technology", "sci-tech-u01", [
        buildTopic("sci-tech-u01-t01", "สิ่งมีชีวิตและกระบวนการดำรงชีวิต"),
        buildTopic("sci-tech-u01-t02", "ระบบนิเวศและความสัมพันธ์"),
    ], [
        buildOutcome(
            "sci-tech-lo-u01-01",
            "อธิบายโครงสร้างหรือกระบวนการสำคัญของสิ่งมีชีวิตและเชื่อมโยงกับการดำรงชีวิตได้",
            ["สิ่งมีชีวิต", "กระบวนการดำรงชีวิต"],
            ["อธิบาย", "เชื่อมโยงหน้าที่กับโครงสร้าง"],
            ["sci-tech-u01-t01"],
            ["diagram explanation", "function-structure response"]
        ),
        buildOutcome(
            "sci-tech-lo-u01-02",
            "วิเคราะห์ความสัมพันธ์ของสิ่งมีชีวิตกับสิ่งแวดล้อมในระบบนิเวศได้",
            ["ระบบนิเวศ", "ความสัมพันธ์ในสิ่งแวดล้อม"],
            ["วิเคราะห์", "อธิบายความสัมพันธ์"],
            ["sci-tech-u01-t02"],
            ["ecosystem case", "cause-effect map"]
        ),
    ]),
    buildOutcomePack("science_technology", "sci-tech-u02", [
        buildTopic("sci-tech-u02-t01", "สสารและพลังงาน"),
        buildTopic("sci-tech-u02-t02", "แรงและการเปลี่ยนแปลง"),
    ], [
        buildOutcome(
            "sci-tech-lo-u02-01",
            "อธิบายสมบัติของสสารหรือพลังงาน และเปรียบเทียบการเปลี่ยนแปลงที่เกิดขึ้นได้",
            ["สสาร", "พลังงาน", "การเปลี่ยนแปลง"],
            ["สังเกต", "เปรียบเทียบ", "อธิบาย"],
            ["sci-tech-u02-t01"],
            ["property comparison", "change explanation"]
        ),
        buildOutcome(
            "sci-tech-lo-u02-02",
            "ใช้แนวคิดเรื่องแรงและการเปลี่ยนแปลงอธิบายปรากฏการณ์ทางกายภาพได้",
            ["แรง", "การเคลื่อนที่", "การเปลี่ยนแปลง"],
            ["อธิบายปรากฏการณ์", "ใช้หลักฐาน"],
            ["sci-tech-u02-t02"],
            ["phenomenon explanation", "evidence-based answer"]
        ),
    ]),
    buildOutcomePack("science_technology", "sci-tech-u03", [
        buildTopic("sci-tech-u03-t01", "โลกและการเปลี่ยนแปลง"),
        buildTopic("sci-tech-u03-t02", "ดาราศาสตร์และอวกาศ"),
    ], [
        buildOutcome(
            "sci-tech-lo-u03-01",
            "อธิบายกระบวนการหรือการเปลี่ยนแปลงที่เกิดขึ้นบนโลกจากข้อมูลและหลักฐานได้",
            ["โลก", "การเปลี่ยนแปลงของโลก"],
            ["อธิบายจากหลักฐาน", "ตีความข้อมูล"],
            ["sci-tech-u03-t01"],
            ["earth process task", "evidence interpretation"]
        ),
        buildOutcome(
            "sci-tech-lo-u03-02",
            "อธิบายปรากฏการณ์เบื้องต้นทางดาราศาสตร์และความสัมพันธ์กับโลกได้",
            ["ดาราศาสตร์", "อวกาศ", "ความสัมพันธ์โลก-อวกาศ"],
            ["อธิบาย", "เชื่อมโยงปรากฏการณ์"],
            ["sci-tech-u03-t02"],
            ["astronomy explanation", "orbit/season task"]
        ),
    ]),
    buildOutcomePack("science_technology", "sci-tech-u04", [
        buildTopic("sci-tech-u04-t01", "การออกแบบและแก้ปัญหา"),
        buildTopic("sci-tech-u04-t02", "วิทยาการคำนวณและข้อมูล"),
    ], [
        buildOutcome(
            "sci-tech-lo-u04-01",
            "ใช้กระบวนการออกแบบหรือแก้ปัญหาอย่างเป็นขั้นตอนเพื่อสร้างชิ้นงานหรือแนวทางแก้ปัญหาได้",
            ["การออกแบบ", "การแก้ปัญหา"],
            ["วางแผน", "ออกแบบ", "ทดสอบ"],
            ["sci-tech-u04-t01"],
            ["design brief", "prototype reflection"]
        ),
        buildOutcome(
            "sci-tech-lo-u04-02",
            "ใช้แนวคิดเชิงคำนวณหรือการจัดการข้อมูลในการวิเคราะห์และสื่อสารวิธีแก้ปัญหาได้",
            ["แนวคิดเชิงคำนวณ", "ข้อมูล"],
            ["ลำดับขั้น", "จำแนกข้อมูล", "สื่อสารกระบวนการ"],
            ["sci-tech-u04-t02"],
            ["algorithm task", "data workflow explanation"]
        ),
    ]),

    buildOutcomePack("social_religion_culture", "social-u01", [
        buildTopic("social-u01-t01", "หลักคิดด้านศาสนาและจริยธรรม"),
        buildTopic("social-u01-t02", "การตัดสินใจเชิงคุณธรรม"),
    ], [
        buildOutcome(
            "social-lo-u01-01",
            "อธิบายหลักคิดหรือคุณค่าทางศาสนาและจริยธรรมที่เกี่ยวข้องกับการดำเนินชีวิตได้",
            ["ศาสนา", "จริยธรรม", "คุณธรรม"],
            ["อธิบาย", "เชื่อมโยงกับชีวิตจริง"],
            ["social-u01-t01"],
            ["value reflection", "concept explanation"]
        ),
        buildOutcome(
            "social-lo-u01-02",
            "วิเคราะห์สถานการณ์และเสนอแนวทางตัดสินใจเชิงคุณธรรมได้",
            ["การตัดสินใจเชิงคุณธรรม", "สถานการณ์ทางสังคม"],
            ["วิเคราะห์", "ให้เหตุผล"],
            ["social-u01-t02"],
            ["ethical scenario", "reasoned response"]
        ),
    ]),
    buildOutcomePack("social_religion_culture", "social-u02", [
        buildTopic("social-u02-t01", "หน้าที่พลเมือง"),
        buildTopic("social-u02-t02", "วัฒนธรรมและชีวิตในสังคม"),
    ], [
        buildOutcome(
            "social-lo-u02-01",
            "อธิบายบทบาท หน้าที่ และความรับผิดชอบของพลเมืองในสังคมได้",
            ["พลเมือง", "หน้าที่", "ความรับผิดชอบ"],
            ["อธิบาย", "ยกตัวอย่าง"],
            ["social-u02-t01"],
            ["civic role task", "responsibility checklist"]
        ),
        buildOutcome(
            "social-lo-u02-02",
            "เคารพความหลากหลายทางวัฒนธรรมและอธิบายการอยู่ร่วมกันในสังคมได้อย่างเหมาะสม",
            ["วัฒนธรรม", "การอยู่ร่วมกัน"],
            ["อธิบาย", "เปรียบเทียบ", "สะท้อนมุมมอง"],
            ["social-u02-t02"],
            ["culture comparison", "community response"]
        ),
    ]),
    buildOutcomePack("social_religion_culture", "social-u03", [
        buildTopic("social-u03-t01", "การตัดสินใจทางเศรษฐกิจ"),
        buildTopic("social-u03-t02", "เศรษฐกิจในชีวิตประจำวัน"),
    ], [
        buildOutcome(
            "social-lo-u03-01",
            "อธิบายแนวคิดพื้นฐานทางเศรษฐศาสตร์ที่เกี่ยวข้องกับการใช้ทรัพยากรและการตัดสินใจได้",
            ["ทรัพยากร", "ทางเลือก", "ต้นทุนค่าเสียโอกาส"],
            ["อธิบาย", "เปรียบเทียบทางเลือก"],
            ["social-u03-t01"],
            ["decision tradeoff task", "economic reasoning"]
        ),
        buildOutcome(
            "social-lo-u03-02",
            "นำแนวคิดเศรษฐศาสตร์ไปใช้วิเคราะห์สถานการณ์ในชีวิตประจำวันได้",
            ["เศรษฐกิจในชีวิตประจำวัน", "การวางแผน"],
            ["วิเคราะห์สถานการณ์", "วางแผน"],
            ["social-u03-t02"],
            ["personal finance case", "budget reflection"]
        ),
    ]),
    buildOutcomePack("social_religion_culture", "social-u04", [
        buildTopic("social-u04-t01", "ลำดับเวลาและเหตุการณ์"),
        buildTopic("social-u04-t02", "ตีความอดีต"),
    ], [
        buildOutcome(
            "social-lo-u04-01",
            "เรียงลำดับเหตุการณ์สำคัญทางประวัติศาสตร์และอธิบายความเปลี่ยนแปลงที่เกิดขึ้นได้",
            ["ลำดับเวลา", "เหตุการณ์สำคัญทางประวัติศาสตร์"],
            ["เรียงลำดับ", "อธิบายการเปลี่ยนแปลง"],
            ["social-u04-t01"],
            ["timeline task", "change-over-time response"]
        ),
        buildOutcome(
            "social-lo-u04-02",
            "ใช้ข้อมูลหรือหลักฐานทางประวัติศาสตร์ในการตีความเหตุการณ์ได้",
            ["หลักฐานทางประวัติศาสตร์", "การตีความ"],
            ["ใช้หลักฐาน", "ตีความ", "ให้เหตุผล"],
            ["social-u04-t02"],
            ["source analysis", "evidence-based history response"]
        ),
    ]),
    buildOutcomePack("social_religion_culture", "social-u05", [
        buildTopic("social-u05-t01", "แผนที่และข้อมูลเชิงพื้นที่"),
        buildTopic("social-u05-t02", "ความสัมพันธ์คนกับสิ่งแวดล้อม"),
    ], [
        buildOutcome(
            "social-lo-u05-01",
            "อ่านและใช้แผนที่หรือข้อมูลเชิงพื้นที่เพื่ออธิบายลักษณะของพื้นที่ได้",
            ["แผนที่", "ข้อมูลเชิงพื้นที่"],
            ["อ่านแผนที่", "ตีความข้อมูล"],
            ["social-u05-t01"],
            ["map-reading task", "location explanation"]
        ),
        buildOutcome(
            "social-lo-u05-02",
            "อธิบายความสัมพันธ์ระหว่างมนุษย์กับสิ่งแวดล้อมในพื้นที่ต่าง ๆ ได้",
            ["สิ่งแวดล้อม", "กิจกรรมของมนุษย์"],
            ["อธิบายความสัมพันธ์", "วิเคราะห์ผลกระทบ"],
            ["social-u05-t02"],
            ["human-environment case", "impact explanation"]
        ),
    ]),

    buildOutcomePack("health_physical_education", "health-pe-u01", [
        buildTopic("health-pe-u01-t01", "พัฒนาการของมนุษย์"),
        buildTopic("health-pe-u01-t02", "การดูแลตนเองตามวัย"),
    ], [
        buildOutcome(
            "health-pe-lo-u01-01",
            "อธิบายการเจริญเติบโตและพัฒนาการของมนุษย์ในช่วงวัยต่าง ๆ ได้",
            ["การเจริญเติบโต", "พัฒนาการ"],
            ["อธิบาย", "เปรียบเทียบช่วงวัย"],
            ["health-pe-u01-t01"],
            ["growth comparison", "development explanation"]
        ),
        buildOutcome(
            "health-pe-lo-u01-02",
            "เลือกแนวทางดูแลสุขภาพของตนเองให้เหมาะสมกับวัยได้",
            ["การดูแลสุขภาพ", "พฤติกรรมสุขภาพ"],
            ["เลือกแนวทาง", "ประเมินตนเอง"],
            ["health-pe-u01-t02"],
            ["self-care plan", "healthy habit checklist"]
        ),
    ]),
    buildOutcomePack("health_physical_education", "health-pe-u02", [
        buildTopic("health-pe-u02-t01", "ความสัมพันธ์และชีวิตครอบครัว"),
        buildTopic("health-pe-u02-t02", "ทักษะชีวิต"),
    ], [
        buildOutcome(
            "health-pe-lo-u02-01",
            "อธิบายบทบาทและความสัมพันธ์ที่เหมาะสมในครอบครัวและสังคมได้",
            ["ครอบครัว", "ความสัมพันธ์"],
            ["อธิบาย", "สะท้อนบทบาท"],
            ["health-pe-u02-t01"],
            ["relationship scenario", "role reflection"]
        ),
        buildOutcome(
            "health-pe-lo-u02-02",
            "ใช้ทักษะชีวิตในการตัดสินใจและจัดการสถานการณ์ใกล้ตัวได้อย่างเหมาะสม",
            ["ทักษะชีวิต", "การตัดสินใจ"],
            ["ตัดสินใจ", "จัดการอารมณ์", "แก้ปัญหา"],
            ["health-pe-u02-t02"],
            ["life-skill scenario", "decision rubric"]
        ),
    ]),
    buildOutcomePack("health_physical_education", "health-pe-u03", [
        buildTopic("health-pe-u03-t01", "การเคลื่อนไหวพื้นฐาน"),
        buildTopic("health-pe-u03-t02", "เกม กีฬา และการออกกำลังกาย"),
    ], [
        buildOutcome(
            "health-pe-lo-u03-01",
            "ปฏิบัติทักษะการเคลื่อนไหวพื้นฐานได้อย่างถูกต้องและปลอดภัย",
            ["การเคลื่อนไหว", "ความปลอดภัย"],
            ["ปฏิบัติทักษะ", "ควบคุมร่างกาย"],
            ["health-pe-u03-t01"],
            ["movement performance", "skills checklist"]
        ),
        buildOutcome(
            "health-pe-lo-u03-02",
            "มีส่วนร่วมในการออกกำลังกาย เกม หรือกีฬา พร้อมอธิบายประโยชน์ต่อสุขภาพได้",
            ["การออกกำลังกาย", "เกมและกีฬา", "สุขภาพ"],
            ["มีส่วนร่วม", "อธิบายประโยชน์"],
            ["health-pe-u03-t02"],
            ["participation rubric", "fitness reflection"]
        ),
    ]),
    buildOutcomePack("health_physical_education", "health-pe-u04", [
        buildTopic("health-pe-u04-t01", "การสร้างเสริมสุขภาพ"),
        buildTopic("health-pe-u04-t02", "ความปลอดภัยและการป้องกัน"),
    ], [
        buildOutcome(
            "health-pe-lo-u04-01",
            "เลือกพฤติกรรมที่ช่วยส่งเสริมสุขภาพของตนเองและส่วนรวมได้",
            ["การสร้างเสริมสุขภาพ", "พฤติกรรมสุขภาพ"],
            ["เลือกพฤติกรรม", "ประเมินผลกระทบ"],
            ["health-pe-u04-t01"],
            ["healthy-choice task", "habit reflection"]
        ),
        buildOutcome(
            "health-pe-lo-u04-02",
            "วิเคราะห์ความเสี่ยงและเสนอแนวทางป้องกันอันตรายในชีวิตประจำวันได้",
            ["ความปลอดภัย", "การป้องกันความเสี่ยง"],
            ["วิเคราะห์ความเสี่ยง", "เสนอแนวทางป้องกัน"],
            ["health-pe-u04-t02"],
            ["risk scenario", "prevention plan"]
        ),
    ]),

    buildOutcomePack("arts", "arts-u01", [
        buildTopic("arts-u01-t01", "องค์ประกอบทัศนศิลป์"),
        buildTopic("arts-u01-t02", "การสร้างสรรค์งาน"),
    ], [
        buildOutcome(
            "arts-lo-u01-01",
            "อธิบายองค์ประกอบหรือหลักการทางทัศนศิลป์ที่พบในงานศิลปะได้",
            ["องค์ประกอบศิลป์", "ทัศนศิลป์"],
            ["สังเกต", "อธิบาย"],
            ["arts-u01-t01"],
            ["art element analysis", "visual explanation"]
        ),
        buildOutcome(
            "arts-lo-u01-02",
            "สร้างสรรค์งานทัศนศิลป์โดยเลือกใช้วัสดุหรือเทคนิคได้เหมาะสม",
            ["การสร้างสรรค์", "วัสดุและเทคนิค"],
            ["สร้างงาน", "เลือกเทคนิค"],
            ["arts-u01-t02"],
            ["art creation rubric", "process reflection"]
        ),
    ]),
    buildOutcomePack("arts", "arts-u02", [
        buildTopic("arts-u02-t01", "การฟังและวิเคราะห์ดนตรี"),
        buildTopic("arts-u02-t02", "การปฏิบัติและสร้างสรรค์ทางดนตรี"),
    ], [
        buildOutcome(
            "arts-lo-u02-01",
            "อธิบายองค์ประกอบหรืออารมณ์ของบทเพลงที่ฟังได้",
            ["ดนตรี", "องค์ประกอบของเพลง", "อารมณ์ของเพลง"],
            ["ฟังวิเคราะห์", "อธิบายความรู้สึก"],
            ["arts-u02-t01"],
            ["music response", "listening analysis"]
        ),
        buildOutcome(
            "arts-lo-u02-02",
            "ปฏิบัติหรือสร้างสรรค์กิจกรรมทางดนตรีได้ตามบริบทที่กำหนด",
            ["การปฏิบัติดนตรี", "การสร้างสรรค์"],
            ["ปฏิบัติ", "ร่วมแสดง", "สร้างสรรค์"],
            ["arts-u02-t02"],
            ["performance rubric", "creative task"]
        ),
    ]),
    buildOutcomePack("arts", "arts-u03", [
        buildTopic("arts-u03-t01", "การแสดงออกทางนาฏศิลป์และการแสดง"),
        buildTopic("arts-u03-t02", "การตีความและการสื่อสารผ่านการแสดง"),
    ], [
        buildOutcome(
            "arts-lo-u03-01",
            "แสดงออกทางนาฏศิลป์หรือการแสดงได้เหมาะสมกับบทบาทและจังหวะ",
            ["นาฏศิลป์", "การแสดง", "บทบาท"],
            ["ปฏิบัติการแสดง", "ควบคุมจังหวะ"],
            ["arts-u03-t01"],
            ["performance observation", "movement rubric"]
        ),
        buildOutcome(
            "arts-lo-u03-02",
            "อธิบายความหมายหรือการสื่อสารที่เกิดขึ้นจากการแสดงได้",
            ["การสื่อสารผ่านการแสดง", "ความหมาย"],
            ["ตีความ", "อธิบาย"],
            ["arts-u03-t02"],
            ["interpretation response", "reflection note"]
        ),
    ]),

    buildOutcomePack("career", "career-u01", [
        buildTopic("career-u01-t01", "การดูแลตนเองและการทำงาน"),
        buildTopic("career-u01-t02", "การวางแผนและความรับผิดชอบ"),
    ], [
        buildOutcome(
            "career-lo-u01-01",
            "ปฏิบัติกิจวัตรหรือภาระงานใกล้ตัวด้วยความรับผิดชอบและเป็นระบบได้",
            ["การดำรงชีวิต", "ความรับผิดชอบ"],
            ["ปฏิบัติงาน", "จัดลำดับงาน"],
            ["career-u01-t01"],
            ["task performance", "work habit checklist"]
        ),
        buildOutcome(
            "career-lo-u01-02",
            "วางแผนการทำงานง่าย ๆ และประเมินผลการทำงานของตนเองได้",
            ["การวางแผน", "การประเมินตนเอง"],
            ["วางแผน", "ประเมินงาน"],
            ["career-u01-t02"],
            ["work plan", "reflection rubric"]
        ),
    ]),
    buildOutcomePack("career", "career-u02", [
        buildTopic("career-u02-t01", "การออกแบบและสร้างชิ้นงาน"),
        buildTopic("career-u02-t02", "การใช้เครื่องมือและเทคโนโลยี"),
    ], [
        buildOutcome(
            "career-lo-u02-01",
            "ออกแบบแนวทางหรือชิ้นงานเพื่อตอบโจทย์ปัญหาง่าย ๆ ได้",
            ["การออกแบบ", "การแก้ปัญหา"],
            ["ออกแบบ", "สร้างแนวทาง"],
            ["career-u02-t01"],
            ["design challenge", "prototype idea"]
        ),
        buildOutcome(
            "career-lo-u02-02",
            "ใช้เครื่องมือหรือเทคโนโลยีได้เหมาะสม ปลอดภัย และสอดคล้องกับงาน",
            ["เครื่องมือ", "เทคโนโลยี", "ความปลอดภัย"],
            ["ใช้เครื่องมือ", "เลือกเทคโนโลยี"],
            ["career-u02-t02"],
            ["tool-use checklist", "safe practice task"]
        ),
    ]),
    buildOutcomePack("career", "career-u03", [
        buildTopic("career-u03-t01", "อาชีพและบทบาทการทำงาน"),
        buildTopic("career-u03-t02", "แนวคิดผู้ประกอบการเบื้องต้น"),
    ], [
        buildOutcome(
            "career-lo-u03-01",
            "อธิบายลักษณะของอาชีพหรือบทบาทการทำงานที่เกี่ยวข้องกับตนเองและชุมชนได้",
            ["อาชีพ", "บทบาทการทำงาน"],
            ["อธิบาย", "เชื่อมโยงกับชุมชน"],
            ["career-u03-t01"],
            ["career profile", "community role response"]
        ),
        buildOutcome(
            "career-lo-u03-02",
            "เสนอแนวคิดเบื้องต้นในการสร้างคุณค่าหรือพัฒนางานอย่างสร้างสรรค์ได้",
            ["ผู้ประกอบการ", "การสร้างคุณค่า"],
            ["คิดสร้างสรรค์", "เสนอแนวคิด"],
            ["career-u03-t02"],
            ["idea pitch", "value creation prompt"]
        ),
    ]),

    buildOutcomePack("foreign_languages", "lang-u01", [
        buildTopic("lang-u01-t01", "ฟังและพูดเพื่อการสื่อสาร"),
        buildTopic("lang-u01-t02", "อ่านและเขียนเพื่อการสื่อสาร"),
    ], [
        buildOutcome(
            "lang-lo-u01-01",
            "เข้าใจและตอบสนองต่อข้อความหรือบทสนทนาพื้นฐานเพื่อการสื่อสารได้",
            ["การสื่อสาร", "การฟัง", "การพูด"],
            ["ฟังจับใจความ", "ตอบสนอง", "พูดสื่อสาร"],
            ["lang-u01-t01"],
            ["dialogue response", "oral interaction"]
        ),
        buildOutcome(
            "lang-lo-u01-02",
            "อ่านและเขียนข้อความพื้นฐานเพื่อสื่อสารข้อมูลหรือความต้องการได้",
            ["การอ่าน", "การเขียน", "การสื่อสารข้อมูล"],
            ["อ่านจับใจความ", "เขียนสื่อสาร"],
            ["lang-u01-t02"],
            ["reading-writing task", "message drafting"]
        ),
    ]),
    buildOutcomePack("foreign_languages", "lang-u02", [
        buildTopic("lang-u02-t01", "ภาษาในบริบทวัฒนธรรม"),
        buildTopic("lang-u02-t02", "มารยาทและความเหมาะสม"),
    ], [
        buildOutcome(
            "lang-lo-u02-01",
            "อธิบายความสัมพันธ์ระหว่างภาษาและวัฒนธรรมในสถานการณ์ที่พบได้",
            ["ภาษา", "วัฒนธรรม"],
            ["อธิบาย", "เปรียบเทียบ"],
            ["lang-u02-t01"],
            ["culture-language comparison", "context explanation"]
        ),
        buildOutcome(
            "lang-lo-u02-02",
            "เลือกใช้ภาษาหรือรูปแบบการสื่อสารได้เหมาะสมกับมารยาทและบริบท",
            ["มารยาททางภาษา", "บริบทการสื่อสาร"],
            ["เลือกใช้ภาษา", "ปรับการสื่อสาร"],
            ["lang-u02-t02"],
            ["register task", "appropriateness rubric"]
        ),
    ]),
    buildOutcomePack("foreign_languages", "lang-u03", [
        buildTopic("lang-u03-t01", "ใช้ภาษาเพื่อเรียนรู้"),
        buildTopic("lang-u03-t02", "เชื่อมโยงกับวิชาอื่น"),
    ], [
        buildOutcome(
            "lang-lo-u03-01",
            "ใช้ภาษาต่างประเทศค้นหา รับ หรือสรุปข้อมูลเพื่อสนับสนุนการเรียนรู้ได้",
            ["การเรียนรู้ผ่านภาษา", "การสืบค้นข้อมูล"],
            ["สืบค้น", "สรุปข้อมูล"],
            ["lang-u03-t01"],
            ["info search task", "summary response"]
        ),
        buildOutcome(
            "lang-lo-u03-02",
            "เชื่อมโยงการใช้ภาษาต่างประเทศกับเนื้อหาในวิชาอื่นได้อย่างเหมาะสม",
            ["บูรณาการข้ามวิชา", "ภาษาเพื่อการเรียนรู้"],
            ["เชื่อมโยงเนื้อหา", "สื่อสารข้ามวิชา"],
            ["lang-u03-t02"],
            ["cross-subject prompt", "content-language task"]
        ),
    ]),
    buildOutcomePack("foreign_languages", "lang-u04", [
        buildTopic("lang-u04-t01", "ภาษาในชุมชนและโลก"),
        buildTopic("lang-u04-t02", "การใช้ภาษาจริงในสถานการณ์จริง"),
    ], [
        buildOutcome(
            "lang-lo-u04-01",
            "อธิบายบทบาทของภาษาต่างประเทศต่อชุมชน สังคม หรือโลกได้",
            ["ชุมชน", "โลก", "บทบาทของภาษา"],
            ["อธิบาย", "ยกตัวอย่าง"],
            ["lang-u04-t01"],
            ["global communication reflection", "role explanation"]
        ),
        buildOutcome(
            "lang-lo-u04-02",
            "ใช้ภาษาต่างประเทศในสถานการณ์จริงหรือสถานการณ์จำลองได้อย่างเหมาะสม",
            ["สถานการณ์จริง", "การใช้ภาษา"],
            ["สื่อสารจริง", "ปรับใช้ภาษา"],
            ["lang-u04-t02"],
            ["role play", "real-world communication rubric"]
        ),
    ]),
]

function getPack(subjectId: CanonicalCoreSubjectId, unitId: string) {
    return SUBJECT_UNIT_LEARNING_OUTCOME_CATALOG.find((pack) => pack.subjectId === subjectId && pack.unitId === unitId) ?? null
}

export function isSubjectUnitLearningOutcomePack(value: unknown): value is SubjectUnitLearningOutcomePack {
    const parsed = subjectUnitLearningOutcomePackSchema.safeParse(value)
    if (!parsed.success) return false

    const topicIds = parsed.data.topics.map((topic) => topic.id)
    const outcomeIds = parsed.data.learningOutcomes.map((outcome) => outcome.id)

    return unique(topicIds) && unique(outcomeIds) && parsed.data.learningOutcomes.every((outcome) => outcome.topicIds.every((topicId) => topicIds.includes(topicId)))
}

export function isSubjectUnitLearningOutcomeCatalog(value: unknown): value is SubjectUnitLearningOutcomeCatalog {
    const parsed = subjectUnitLearningOutcomeCatalogSchema.safeParse(value)
    if (!parsed.success) return false

    return unique(parsed.data.map((pack) => `${pack.subjectId}:${pack.unitId}`)) && parsed.data.every(isSubjectUnitLearningOutcomePack)
}

export function validateSubjectUnitLearningOutcomeCatalog(value: unknown) {
    const parsed = subjectUnitLearningOutcomeCatalogSchema.safeParse(value)
    if (!parsed.success) {
        return parsed
    }

    const issues: z.ZodIssue[] = []
    const packKeys = parsed.data.map((pack) => `${pack.subjectId}:${pack.unitId}`)
    if (!unique(packKeys)) {
        issues.push({
            code: z.ZodIssueCode.custom,
            message: "Outcome packs must contain unique subjectId/unitId pairs.",
            path: [],
        })
    }

    parsed.data.forEach((pack, packIndex) => {
        const topicIds = pack.topics.map((topic) => topic.id)
        const outcomeIds = pack.learningOutcomes.map((outcome) => outcome.id)

        if (!unique(topicIds)) {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "Topic ids must be unique within a unit outcome pack.",
                path: [packIndex, "topics"],
            })
        }

        if (!unique(outcomeIds)) {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "Outcome ids must be unique within a unit outcome pack.",
                path: [packIndex, "learningOutcomes"],
            })
        }

        pack.learningOutcomes.forEach((outcome, outcomeIndex) => {
            outcome.topicIds.forEach((topicId, topicIndex) => {
                if (!topicIds.includes(topicId)) {
                    issues.push({
                        code: z.ZodIssueCode.custom,
                        message: "Outcome topicIds must point to an existing topic in the same unit.",
                        path: [packIndex, "learningOutcomes", outcomeIndex, "topicIds", topicIndex],
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

export function getSubjectUnitLearningOutcomePack(subjectId: CanonicalCoreSubjectId, unitId: string) {
    return getPack(subjectId, unitId)
}

export function listSubjectUnitLearningOutcomes(subjectId: CanonicalCoreSubjectId, unitId: string) {
    return getPack(subjectId, unitId)?.learningOutcomes ?? []
}

export function findSubjectUnitLearningOutcome(outcomeId: string) {
    for (const pack of SUBJECT_UNIT_LEARNING_OUTCOME_CATALOG) {
        const outcome = pack.learningOutcomes.find((entry) => entry.id === outcomeId)
        if (outcome) {
            return { pack, outcome }
        }
    }
    return null
}

export function validateSubjectUnitOutcomeSelection(
    value: SubjectUnitOutcomeSelection
): { ok: true; pack: SubjectUnitLearningOutcomePack } | { ok: false; issues: SubjectUnitOutcomeSelectionIssue[] } {
    const issues: SubjectUnitOutcomeSelectionIssue[] = []

    const subjectParsed = canonicalCoreSubjectIdSchema.safeParse(value.subjectId)
    if (!subjectParsed.success) {
        return {
            ok: false,
            issues: [{ code: "INVALID_SUBJECT_ID", message: "subjectId must be a canonical core subject id." }],
        }
    }

    const pack = getPack(subjectParsed.data, value.unitId)
    if (!pack) {
        const subjectPack = getSubjectCurriculumMapPack(subjectParsed.data)
        if (!subjectPack) {
            return {
                ok: false,
                issues: [{ code: "PACK_NOT_FOUND", message: "Subject curriculum map pack was not found." }],
            }
        }

        return {
            ok: false,
            issues: [{ code: "UNIT_NOT_FOUND", message: "Unit outcome pack was not found for the requested unit.", unitId: value.unitId }],
        }
    }

    if (typeof value.primaryOutcomeId !== "string" || value.primaryOutcomeId.trim().length === 0) {
        issues.push({ code: "EMPTY_PRIMARY_OUTCOME_ID", message: "primaryOutcomeId is required." })
    } else {
        const primary = pack.learningOutcomes.find((outcome) => outcome.id === value.primaryOutcomeId)
        if (!primary) {
            const found = findSubjectUnitLearningOutcome(value.primaryOutcomeId)
            issues.push({
                code: found ? "PRIMARY_OUTCOME_OUTSIDE_UNIT" : "PRIMARY_OUTCOME_NOT_FOUND",
                message: found
                    ? "primaryOutcomeId exists but belongs to a different unit."
                    : "primaryOutcomeId does not exist in the requested unit outcome pack.",
                outcomeId: value.primaryOutcomeId,
                unitId: value.unitId,
            })
        }
    }

    const supportingOutcomeIds = value.supportingOutcomeIds ?? []
    const seen = new Set<string>()
    for (const outcomeId of supportingOutcomeIds) {
        if (seen.has(outcomeId)) {
            issues.push({
                code: "DUPLICATE_SUPPORTING_OUTCOME_ID",
                message: "supportingOutcomeIds must be unique.",
                outcomeId,
            })
            continue
        }
        seen.add(outcomeId)

        const supporting = pack.learningOutcomes.find((outcome) => outcome.id === outcomeId)
        if (!supporting) {
            const found = findSubjectUnitLearningOutcome(outcomeId)
            issues.push({
                code: found ? "SUPPORTING_OUTCOME_OUTSIDE_UNIT" : "SUPPORTING_OUTCOME_NOT_FOUND",
                message: found
                    ? "supportingOutcomeId exists but belongs to a different unit."
                    : "supportingOutcomeId does not exist in the requested unit outcome pack.",
                outcomeId,
                unitId: value.unitId,
            })
        }
    }

    if (issues.length > 0) {
        return { ok: false, issues }
    }

    return { ok: true, pack }
}
