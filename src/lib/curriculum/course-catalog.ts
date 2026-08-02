import { z } from "zod"
import { SECONDARY_CORE_CURRICULUM_INDICATOR_CATALOG } from "@/lib/curriculum/canonical-indicators"
import {
    canonicalGradeLevelSchema,
    getGradeBandForLevel,
    type CanonicalGradeBand,
    type CanonicalGradeLevel,
} from "@/lib/curriculum/grade-model"
import { getCurriculumStandardByCode, getIndicatorsForStandard } from "@/lib/curriculum/indicators"
import { PRIMARY_CORE_DOCX_SOURCE_ID } from "@/lib/curriculum/import/primary-core-docx-source"
import { PRIMARY_CORE_UNIT_ROWS_PAYLOAD } from "@/lib/curriculum/import/primary-core-unit-rows-payload"
import {
    getPrimaryCoreCourse,
    getPrimaryCoreIndicatorCrosswalkRowsForCourse,
    getPrimaryCoreUnitsForCourse,
    type PrimaryCoreUnitCourse,
    type PrimaryCoreIndicatorCrosswalkRow,
} from "@/lib/curriculum/import/primary-core-unit-rows-source"
import {
    SECONDARY_CORE_COURSE_DESCRIPTIONS_PAYLOAD,
} from "@/lib/curriculum/import/secondary-core-course-descriptions-payload"
import {
    getSecondaryCoreCourseDescription,
} from "@/lib/curriculum/import/secondary-core-course-descriptions-source"
import { SECONDARY_CORE_UNIT_ROWS_PAYLOAD } from "@/lib/curriculum/import/secondary-core-unit-rows-payload"
import {
    getSecondaryCoreUnitsForCourse,
    type SecondaryCoreUnit,
} from "@/lib/curriculum/import/secondary-core-unit-rows-source"
import { SECONDARY_CORE_DOCX_SOURCE_ID } from "@/lib/curriculum/import/secondary-core-docx-source"
import {
    getSubjectCurriculumMapPack,
    SUBJECT_CURRICULUM_MAP_PACKS,
} from "@/lib/curriculum/map-packs"
import { BASIC_EDUCATION_CURRICULUM_SOURCE_REGISTRY } from "@/lib/curriculum/source-registry"
import {
    getCanonicalCoreSubjects,
    getCanonicalAdditionalSubjects,
    getCanonicalSubjectById,
    type CanonicalCoreSubjectId,
    type CanonicalSubjectId,
} from "@/lib/curriculum/subject-catalog"
import { CURRICULUM_STRAND_STANDARD_CATALOG } from "@/lib/curriculum/strands-and-standards"
import { PHYSICS_ADDITIONAL_UPPER_SECONDARY_COURSES } from "@/lib/curriculum/import/physics-additional-upper-secondary-source"
import { CHEM_ADDITIONAL_UPPER_SECONDARY_COURSES } from "@/lib/curriculum/import/chemistry-additional-upper-secondary-source"
import { BIO_ADDITIONAL_UPPER_SECONDARY_COURSES } from "@/lib/curriculum/import/biology-additional-upper-secondary-source"
import { EARTH_ADDITIONAL_UPPER_SECONDARY_COURSES } from "@/lib/curriculum/import/earth-space-additional-upper-secondary-source"

export const canonicalCourseEntrySchema = z.object({
    id: z.string().trim().min(1),
    coreSubjectId: z.enum([
        "thai",
        "mathematics",
        "science_technology",
        "social_religion_culture",
        "health_physical_education",
        "arts",
        "career",
        "foreign_languages",
        "physics",
        "chemistry",
        "biology",
        "earth_space_science",
    ]),
    courseCode: z.string().trim().min(1).nullable(),
    titleTh: z.string().trim().min(1),
    titleEn: z.string().trim().min(1).nullable(),
    gradeLevel: canonicalGradeLevelSchema,
    semester: z.union([z.literal(1), z.literal(2)]).nullable(),
    strandIds: z.array(z.string().trim().min(1)).min(1),
    standardIds: z.array(z.string().trim().min(1)).min(1),
    duringIndicatorIds: z.array(z.string().trim().min(1)),
    terminalIndicatorIds: z.array(z.string().trim().min(1)),
    descriptionText: z.string().trim().min(1).nullable(),
    sourceRegistryIds: z.array(z.string().trim().min(1)).min(1),
    unitIds: z.array(z.string().trim().min(1)).min(1),
})

export const canonicalCourseCatalogSchema = z.array(canonicalCourseEntrySchema).min(1)

export type CanonicalCourseEntry = z.infer<typeof canonicalCourseEntrySchema>
export type CanonicalCourseCatalog = z.infer<typeof canonicalCourseCatalogSchema>

function unique<T>(values: T[]) {
    return [...new Set(values)]
}

const PHYSICAL_SCIENCE_PHYSICS_M5_DESCRIPTION = [
    "ศึกษา วิเคราะห์ และแปลความหมายของปริมาณที่เกี่ยวข้องกับการเคลื่อนที่ ระยะทาง การกระจัด อัตราเร็ว ความเร็ว ความเร่ง การตกแบบเสรี ลักษณะของแรง การหาแรงลัพธ์ กฎการเคลื่อนที่ของนิวตัน การเคลื่อนที่แบบโพรเจกไทล์ การเคลื่อนที่แบบวงกลม แรงสู่ศูนย์กลาง ความเร่งสู่ศูนย์กลาง การประยุกต์ใช้ความรู้การเคลื่อนที่แบบวงกลมในการอธิบายการเคลื่อนที่ของรถบนถนนโค้ง การแกว่งของวัตถุติดปลายเชือก การสั่นของวัตถุติดปลายสปริง แรงโน้มถ่วงและสนามโน้มถ่วง การเคลื่อนที่ของวัตถุในสนามโน้มถ่วงของโลก ประโยชน์จากสนามโน้มถ่วง แรงไฟฟ้าและสนามไฟฟ้า ผลของสนามไฟฟ้าต่ออนุภาคที่มีประจุไฟฟ้า ประโยชน์จากสนามไฟฟ้า แรงแม่เหล็กและสนามแม่เหล็ก สนามแม่เหล็กที่เกิดจากกระแสไฟฟ้า ผลของสนามแม่เหล็กต่ออนุภาคที่มีประจุไฟฟ้า ผลของสนามแม่เหล็กต่อตัวนำที่มีกระแสไฟฟ้า ประโยชน์จากสนามแม่เหล็ก กระแสไฟฟ้าในลวดตัวนำที่เกิดจากสนามแม่เหล็กและเครื่องกำเนิดไฟฟ้า แรงนิวเคลียร์อย่างเข้ม แรงนิวเคลียร์อย่างอ่อน พลังงานในชีวิตประจำวัน พลังงานไม่หมุนเวียน พลังงานหมุนเวียน ไฟฟ้าจากพลังงานนิวเคลียร์ ไฟฟ้าจากพลังงานแสงอาทิตย์ พลังงานนิวเคลียร์ฟิชชัน พลังงานนิวเคลียร์ฟิวชัน การประยุกต์ใช้เทคโนโลยีพลังงาน คลื่นกล ส่วนประกอบของคลื่น สมบัติของคลื่น ความถี่ธรรมชาติและการสั่นพ้อง เสียง สมบัติของคลื่นเสียง ระดับเสียง ความเข้มเสียง การได้ยินเสียง บีต ดอปเพลอร์ การนำความรู้เรื่องเสียงไปใช้ประโยชน์ แสง ตากับการมองเห็นสี การผสมแสงสี การผสมสารสี และการใช้ประโยชน์ คลื่นแม่เหล็กไฟฟ้า สเปกตรัมคลื่นแม่เหล็กไฟฟ้า ประโยชน์ของคลื่นแม่เหล็กไฟฟ้า อุปกรณ์ควบคุมระยะไกล การใช้คลื่นแม่เหล็กไฟฟ้าในการสื่อสารข้อมูล สัญญาณแอนะล็อก และสัญญาณดิจิทัล",
    "โดยใช้กระบวนการทางวิทยาศาสตร์ กระบวนการสืบเสาะหาความรู้ การสำรวจตรวจสอบ การสืบค้นข้อมูล การสังเกต การวิเคราะห์ การอภิปราย และการสรุปผล เพื่อให้เกิดความรู้ ความคิด และความเข้าใจ มีความสามารถในการตัดสินใจ สื่อสารสิ่งที่เรียนรู้และนำความรู้ไปใช้ในชีวิตประจำวัน ตลอดจนมีจิตวิทยาศาสตร์ จริยธรรม คุณธรรม และค่านิยมที่เหมาะสม",
].join("\n\n")

type SecondaryCoreCourseDefinition = {
    id: string
    coreSubjectId: CanonicalCoreSubjectId
    titleTh: string
    titleEn: string | null
    gradeBands: CanonicalGradeBand[]
    /** When set, overrides gradeBands — only these specific grade levels get an entry */
    gradeLevels?: CanonicalGradeLevel[]
    unitIds: string[]
    descriptionText: string
    sourceTitleTh?: string | ((gradeLevel: CanonicalGradeLevel) => string)
}

const SECONDARY_GRADE_LEVELS = ["m1", "m2", "m3", "m4", "m5", "m6"] as const satisfies CanonicalGradeLevel[]
const PRIMARY_GRADE_LEVELS = ["p1", "p2", "p3", "p4", "p5", "p6"] as const satisfies CanonicalGradeLevel[]

const LOWER_SECONDARY_GRADE_BAND = ["m1_m3"] as const satisfies CanonicalGradeBand[]
const UPPER_SECONDARY_GRADE_BAND = ["m4_m6"] as const satisfies CanonicalGradeBand[]
const ALL_SECONDARY_GRADE_BANDS = ["m1_m3", "m4_m6"] as const satisfies CanonicalGradeBand[]

type PrimaryCoreCourseDefinition = {
    id: string
    coreSubjectId: CanonicalCoreSubjectId
    titleTh: string
    titleEn: string | null
}

const PRIMARY_CORE_COURSE_DEFINITIONS: PrimaryCoreCourseDefinition[] = [
    { id: "thai-language-use", coreSubjectId: "thai", titleTh: "หลักภาษาและการใช้ภาษาไทย", titleEn: "Thai Language Use" },
    { id: "thai-literature", coreSubjectId: "thai", titleTh: "วรรณคดีและวรรณกรรม", titleEn: "Thai Literature" },
    { id: "mathematics", coreSubjectId: "mathematics", titleTh: "คณิตศาสตร์", titleEn: "Mathematics" },
    { id: "science", coreSubjectId: "science_technology", titleTh: "วิทยาศาสตร์และเทคโนโลยี", titleEn: "Science and Technology" },
    { id: "computing-science", coreSubjectId: "science_technology", titleTh: "เทคโนโลยี (วิทยาการคำนวณ)", titleEn: "Computing Science" },
    { id: "social-studies", coreSubjectId: "social_religion_culture", titleTh: "สังคมศึกษา ศาสนา และวัฒนธรรม", titleEn: "Social Studies" },
    { id: "buddhism", coreSubjectId: "social_religion_culture", titleTh: "พระพุทธศาสนา", titleEn: "Buddhism" },
    { id: "history", coreSubjectId: "social_religion_culture", titleTh: "ประวัติศาสตร์", titleEn: "History" },
    { id: "geography", coreSubjectId: "social_religion_culture", titleTh: "ภูมิศาสตร์", titleEn: "Geography" },
    { id: "health-physical-education", coreSubjectId: "health_physical_education", titleTh: "สุขศึกษาและพลศึกษา", titleEn: "Health and Physical Education" },
    { id: "visual-arts", coreSubjectId: "arts", titleTh: "ทัศนศิลป์", titleEn: "Visual Arts" },
    { id: "music-dance", coreSubjectId: "arts", titleTh: "ดนตรี-นาฏศิลป์", titleEn: "Music and Dance" },
    { id: "career", coreSubjectId: "career", titleTh: "การงานอาชีพ", titleEn: "Career" },
    { id: "english-smile", coreSubjectId: "foreign_languages", titleTh: "ภาษาอังกฤษ Smile", titleEn: "English Smile" },
]

function getSecondaryGradeNumber(gradeLevel: CanonicalGradeLevel) {
    return Number(gradeLevel.slice(1))
}

function resolveSecondaryCoreSourceTitle(
    definition: SecondaryCoreCourseDefinition,
    gradeLevel: CanonicalGradeLevel
) {
    if (typeof definition.sourceTitleTh === "function") {
        return definition.sourceTitleTh(gradeLevel)
    }

    return definition.sourceTitleTh ?? definition.titleTh
}

function resolveSecondaryCoreCourseDescription(
    definition: SecondaryCoreCourseDefinition,
    gradeLevel: CanonicalGradeLevel
) {
    const sourceTitleTh = resolveSecondaryCoreSourceTitle(definition, gradeLevel)
    const matchedDescription = getSecondaryCoreCourseDescription(
        SECONDARY_CORE_COURSE_DESCRIPTIONS_PAYLOAD,
        sourceTitleTh,
        gradeLevel
    )

    return matchedDescription?.descriptionText ?? definition.descriptionText
}

const SECONDARY_CORE_COURSE_DEFINITIONS: SecondaryCoreCourseDefinition[] = [
    {
        id: "thai-language-use",
        coreSubjectId: "thai",
        titleTh: "หลักภาษาและการใช้ภาษาไทย",
        titleEn: "Thai Grammar and Language Use",
        gradeBands: ALL_SECONDARY_GRADE_BANDS,
        unitIds: ["thai-u04"],
        descriptionText: "รายวิชาพื้นฐานภาษาไทยด้านหลักภาษา การใช้ภาษา และธรรมชาติของภาษาไทย",
        sourceTitleTh: "ภาษาไทย หลักภาษาและการใช้ภาษาไทย",
    },
    {
        id: "thai-literature",
        coreSubjectId: "thai",
        titleTh: "วรรณคดีและวรรณกรรม",
        titleEn: "Thai Literature",
        gradeBands: ALL_SECONDARY_GRADE_BANDS,
        unitIds: ["thai-u05"],
        descriptionText: "รายวิชาพื้นฐานภาษาไทยด้านวรรณคดี วรรณกรรม การอ่านวิเคราะห์ และคุณค่าทางภาษา",
        sourceTitleTh: "ภาษาไทย วรรณคดีและวรรณกรรม",
    },
    {
        id: "mathematics",
        coreSubjectId: "mathematics",
        titleTh: "คณิตศาสตร์",
        titleEn: "Mathematics",
        gradeBands: ALL_SECONDARY_GRADE_BANDS,
        unitIds: ["math-u01", "math-u02", "math-u03", "math-u04"],
        descriptionText: "รายวิชาพื้นฐานคณิตศาสตร์ ครอบคลุมจำนวน พีชคณิต เรขาคณิต สถิติ ความน่าจะเป็น และการแก้ปัญหา",
    },
    {
        id: "science-technology-integrated",
        coreSubjectId: "science_technology",
        titleTh: "วิทยาศาสตร์และเทคโนโลยี",
        titleEn: "Science and Technology",
        gradeBands: LOWER_SECONDARY_GRADE_BAND,
        unitIds: ["sci-tech-u01", "sci-tech-u02", "sci-tech-u03", "sci-tech-u04"],
        descriptionText: "รายวิชาพื้นฐานระดับมัธยมศึกษาตอนต้น ครอบคลุมวิทยาศาสตร์ชีวภาพ กายภาพ โลกและอวกาศ และเทคโนโลยี",
    },
    {
        id: "technology-computing-lower",
        coreSubjectId: "science_technology",
        titleTh: "เทคโนโลยี (วิทยาการคำนวณ)",
        titleEn: "Technology (Computing Science)",
        gradeBands: LOWER_SECONDARY_GRADE_BAND,
        unitIds: ["sci-tech-u04"],
        descriptionText: "รายวิชาพื้นฐานเทคโนโลยีด้านวิทยาการคำนวณ การคิดเชิงคำนวณ และการแก้ปัญหาด้วยเทคโนโลยี",
    },
    {
        id: "technology-design-lower",
        coreSubjectId: "science_technology",
        titleTh: "เทคโนโลยี (การออกแบบและเทคโนโลยี)",
        titleEn: "Technology (Design and Technology)",
        gradeBands: LOWER_SECONDARY_GRADE_BAND,
        unitIds: ["sci-tech-u04"],
        descriptionText: "รายวิชาพื้นฐานเทคโนโลยีด้านกระบวนการออกแบบ การสร้างชิ้นงาน และการใช้เทคโนโลยีอย่างเหมาะสม",
    },
    {
        id: "biology-science",
        coreSubjectId: "science_technology",
        titleTh: "วิทยาศาสตร์ชีวภาพ",
        titleEn: "Biological Science",
        gradeBands: UPPER_SECONDARY_GRADE_BAND,
        gradeLevels: ["m4"],
        unitIds: ["sci-tech-u01"],
        descriptionText: "รายวิชาพื้นฐานวิทยาศาสตร์ชีวภาพ ครอบคลุมสิ่งมีชีวิต ระบบนิเวศ พันธุกรรม และวิวัฒนาการ",
    },
    {
        id: "physical-science-chemistry",
        coreSubjectId: "science_technology",
        titleTh: "วิทยาศาสตร์กายภาพ 1 (เคมี)",
        titleEn: "Physical Science 1 (Chemistry)",
        gradeBands: UPPER_SECONDARY_GRADE_BAND,
        gradeLevels: ["m5"],
        unitIds: ["sci-tech-u02-chemistry"],
        descriptionText: "รายวิชาพื้นฐานวิทยาศาสตร์กายภาพด้านสาร องค์ประกอบของสาร และการเปลี่ยนแปลงทางเคมี",
    },
    {
        id: "physical-science-physics",
        coreSubjectId: "science_technology",
        titleTh: "วิทยาศาสตร์กายภาพ 2 (ฟิสิกส์)",
        titleEn: "Physical Science 2 (Physics)",
        gradeBands: UPPER_SECONDARY_GRADE_BAND,
        gradeLevels: ["m5"],
        unitIds: ["sci-tech-u02-physics"],
        descriptionText: PHYSICAL_SCIENCE_PHYSICS_M5_DESCRIPTION,
    },
    {
        id: "earth-space-science",
        coreSubjectId: "science_technology",
        titleTh: "วิทยาศาสตร์โลกและอวกาศ",
        titleEn: "Earth and Space Science",
        gradeBands: UPPER_SECONDARY_GRADE_BAND,
        gradeLevels: ["m6"],
        unitIds: ["sci-tech-u03"],
        descriptionText: "รายวิชาพื้นฐานด้านโลก ดาราศาสตร์ อวกาศ ระบบโลก และปรากฏการณ์ทางธรรมชาติ",
    },
    {
        id: "technology-computing-upper",
        coreSubjectId: "science_technology",
        titleTh: "เทคโนโลยี (วิทยาการคำนวณ)",
        titleEn: "Technology (Computing Science)",
        gradeBands: UPPER_SECONDARY_GRADE_BAND,
        gradeLevels: ["m4", "m5", "m6"],
        unitIds: ["sci-tech-u04"],
        descriptionText: "รายวิชาพื้นฐานเทคโนโลยีด้านวิทยาการคำนวณ ข้อมูล อัลกอริทึม และการใช้เทคโนโลยีดิจิทัล",
    },
    {
        id: "technology-design-upper",
        coreSubjectId: "science_technology",
        titleTh: "เทคโนโลยี (การออกแบบและเทคโนโลยี)",
        titleEn: "Technology (Design and Technology)",
        gradeBands: UPPER_SECONDARY_GRADE_BAND,
        gradeLevels: ["m4", "m5"],
        unitIds: ["sci-tech-u04"],
        descriptionText: "รายวิชาพื้นฐานเทคโนโลยีด้านการออกแบบเชิงวิศวกรรม ระบบเทคโนโลยี และการสร้างนวัตกรรม",
    },
    {
        id: "social-studies-religion-culture",
        coreSubjectId: "social_religion_culture",
        titleTh: "สังคมศึกษา ศาสนา และวัฒนธรรม",
        titleEn: "Social Studies, Religion and Culture",
        gradeBands: LOWER_SECONDARY_GRADE_BAND,
        unitIds: ["social-u01", "social-u02", "social-u03", "social-u04", "social-u05"],
        descriptionText: "รายวิชาพื้นฐานสังคมศึกษา ศาสนา วัฒนธรรม ประวัติศาสตร์ เศรษฐศาสตร์ และภูมิศาสตร์",
    },
    {
        id: "buddhism",
        coreSubjectId: "social_religion_culture",
        titleTh: "พระพุทธศาสนา",
        titleEn: "Buddhism",
        gradeBands: ALL_SECONDARY_GRADE_BANDS,
        unitIds: ["social-u01"],
        descriptionText: "รายวิชาพื้นฐานด้านพระพุทธศาสนา คุณธรรม จริยธรรม และการนำหลักธรรมไปใช้",
    },
    {
        id: "civics-culture-social-life",
        coreSubjectId: "social_religion_culture",
        titleTh: "หน้าที่พลเมือง วัฒนธรรม และการดำเนินชีวิตในสังคม",
        titleEn: "Civics, Culture and Social Life",
        gradeBands: ALL_SECONDARY_GRADE_BANDS,
        gradeLevels: ["m1", "m2", "m3", "m4"],
        unitIds: ["social-u02"],
        descriptionText: "รายวิชาพื้นฐานด้านหน้าที่พลเมือง วัฒนธรรม การอยู่ร่วมกัน และชีวิตในสังคมประชาธิปไตย",
    },
    {
        id: "economics",
        coreSubjectId: "social_religion_culture",
        titleTh: "เศรษฐศาสตร์",
        titleEn: "Economics",
        gradeBands: ALL_SECONDARY_GRADE_BANDS,
        gradeLevels: ["m1", "m2", "m3", "m4"],
        unitIds: ["social-u03"],
        descriptionText: "รายวิชาพื้นฐานด้านเศรษฐศาสตร์ การผลิต การบริโภค การเงิน และการตัดสินใจทางเศรษฐกิจ",
    },
    {
        id: "history-lower",
        coreSubjectId: "social_religion_culture",
        titleTh: "ประวัติศาสตร์",
        titleEn: "History",
        gradeBands: LOWER_SECONDARY_GRADE_BAND,
        unitIds: ["social-u04"],
        descriptionText: "รายวิชาพื้นฐานด้านประวัติศาสตร์ วิธีการทางประวัติศาสตร์ และพัฒนาการของมนุษย์",
    },
    {
        id: "thai-history",
        coreSubjectId: "social_religion_culture",
        titleTh: "ประวัติศาสตร์ไทย",
        titleEn: "Thai History",
        gradeBands: UPPER_SECONDARY_GRADE_BAND,
        gradeLevels: ["m4"],
        unitIds: ["social-u04"],
        descriptionText: "รายวิชาพื้นฐานด้านประวัติศาสตร์ไทย เหตุการณ์สำคัญ และพัฒนาการของสังคมไทย",
    },
    {
        id: "world-history",
        coreSubjectId: "social_religion_culture",
        titleTh: "ประวัติศาสตร์สากล",
        titleEn: "World History",
        gradeBands: UPPER_SECONDARY_GRADE_BAND,
        gradeLevels: ["m4"],
        unitIds: ["social-u04"],
        descriptionText: "รายวิชาพื้นฐานด้านประวัติศาสตร์สากล อารยธรรม เหตุการณ์สำคัญ และความเปลี่ยนแปลงของโลก",
    },
    {
        id: "geography",
        coreSubjectId: "social_religion_culture",
        titleTh: "ภูมิศาสตร์",
        titleEn: "Geography",
        gradeBands: ALL_SECONDARY_GRADE_BANDS,
        gradeLevels: ["m1", "m2", "m3", "m4"],
        unitIds: ["social-u05"],
        descriptionText: "รายวิชาพื้นฐานด้านภูมิศาสตร์ สิ่งแวดล้อม แผนที่ พื้นที่ และความสัมพันธ์ระหว่างมนุษย์กับสิ่งแวดล้อม",
    },
    {
        id: "health-education",
        coreSubjectId: "health_physical_education",
        titleTh: "สุขศึกษา",
        titleEn: "Health Education",
        gradeBands: ALL_SECONDARY_GRADE_BANDS,
        unitIds: ["health-pe-u01", "health-pe-u02", "health-pe-u04"],
        descriptionText: "รายวิชาพื้นฐานด้านสุขศึกษา การเจริญเติบโต ชีวิต ครอบครัว การสร้างเสริมสุขภาพ และความปลอดภัย",
    },
    {
        id: "visual-art",
        coreSubjectId: "arts",
        titleTh: "ทัศนศิลป์",
        titleEn: "Visual Arts",
        gradeBands: ALL_SECONDARY_GRADE_BANDS,
        unitIds: ["arts-u01"],
        descriptionText: "รายวิชาพื้นฐานด้านทัศนศิลป์ การสร้างสรรค์ การวิเคราะห์ และการวิจารณ์งานศิลปะ",
    },
    {
        id: "music-dance-lower",
        coreSubjectId: "arts",
        titleTh: "ดนตรี-นาฏศิลป์",
        titleEn: "Music and Dance",
        gradeBands: LOWER_SECONDARY_GRADE_BAND,
        unitIds: ["arts-u02", "arts-u03"],
        descriptionText: "รายวิชาพื้นฐานระดับมัธยมศึกษาตอนต้นด้านดนตรี นาฏศิลป์ และการแสดง",
    },
    {
        id: "music",
        coreSubjectId: "arts",
        titleTh: "ดนตรี",
        titleEn: "Music",
        gradeBands: UPPER_SECONDARY_GRADE_BAND,
        unitIds: ["arts-u02"],
        descriptionText: "รายวิชาพื้นฐานด้านดนตรี การฟัง การแสดงออก การสร้างสรรค์ และการวิจารณ์คุณค่าดนตรี",
    },
    {
        id: "dance",
        coreSubjectId: "arts",
        titleTh: "นาฏศิลป์",
        titleEn: "Dance and Dramatic Arts",
        gradeBands: UPPER_SECONDARY_GRADE_BAND,
        unitIds: ["arts-u03"],
        descriptionText: "รายวิชาพื้นฐานด้านนาฏศิลป์ การแสดง การสร้างสรรค์ และการเชื่อมโยงกับวัฒนธรรม",
    },
    {
        id: "career-work",
        coreSubjectId: "career",
        titleTh: "การงานอาชีพ",
        titleEn: "Career and Work",
        gradeBands: ALL_SECONDARY_GRADE_BANDS,
        unitIds: ["career-u01", "career-u02", "career-u03"],
        descriptionText: "รายวิชาพื้นฐานด้านการงานอาชีพ ทักษะการทำงาน การออกแบบ เทคโนโลยี และการเตรียมอาชีพ",
    },
    {
        id: "english-action",
        coreSubjectId: "foreign_languages",
        titleTh: "ภาษาอังกฤษ ACTION",
        titleEn: "English ACTION",
        gradeBands: LOWER_SECONDARY_GRADE_BAND,
        unitIds: ["lang-u01", "lang-u02", "lang-u03", "lang-u04"],
        descriptionText: "รายวิชาพื้นฐานภาษาอังกฤษระดับมัธยมศึกษาตอนต้น เพื่อการสื่อสารและการเรียนรู้ข้ามวัฒนธรรม",
        sourceTitleTh: (gradeLevel) => `ภาษาอังกฤษ ACTION ${getSecondaryGradeNumber(gradeLevel)}`,
    },
    {
        id: "english-upbeat",
        coreSubjectId: "foreign_languages",
        titleTh: "ภาษาอังกฤษ UPBEAT",
        titleEn: "English UPBEAT",
        gradeBands: UPPER_SECONDARY_GRADE_BAND,
        unitIds: ["lang-u01", "lang-u02", "lang-u03", "lang-u04"],
        descriptionText: "รายวิชาพื้นฐานภาษาอังกฤษระดับมัธยมศึกษาตอนปลาย เพื่อการสื่อสาร การศึกษาต่อ และการใช้ในสังคมโลก",
        sourceTitleTh: (gradeLevel) => `ภาษาอังกฤษ UPBEAT ${getSecondaryGradeNumber(gradeLevel)}`,
    },
]

function buildCourseId(subjectId: CanonicalCoreSubjectId, courseDefinitionId: string, gradeLevel: CanonicalGradeLevel) {
    return `${subjectId}:${courseDefinitionId}:${gradeLevel}`
}

function buildAdditionalCourseId(subjectId: CanonicalSubjectId, courseDefinitionId: string, gradeLevel: CanonicalGradeLevel, semester: 1 | 2) {
    return `${subjectId}:${courseDefinitionId}:${gradeLevel}:s${semester}`
}

function buildCourseEntryFromDefinition(
    definition: SecondaryCoreCourseDefinition,
    gradeLevel: CanonicalGradeLevel
): CanonicalCourseEntry {
    const subject = getCanonicalSubjectById(definition.coreSubjectId)
    if (!subject) {
        throw new Error(`Missing canonical subject metadata for ${definition.coreSubjectId}`)
    }
    const pack = getSubjectCurriculumMapPack(definition.coreSubjectId)
    if (!pack) {
        throw new Error(`Missing curriculum map pack for ${definition.coreSubjectId}`)
    }
    const units = definition.unitIds.map((unitId) => {
        const unit = pack.unitOutlines.find((candidate) => candidate.id === unitId)
        if (!unit) {
            throw new Error(`Missing curriculum unit ${definition.coreSubjectId}:${unitId}`)
        }
        return unit
    })
    const standardIds = unique(units.flatMap((unit) => unit.standardIds))
    const strandIds = unique(units.map((unit) => unit.strandId))

    const duringIndicatorIds = unique(
        standardIds.flatMap((standardId) =>
            getIndicatorsForStandard(SECONDARY_CORE_CURRICULUM_INDICATOR_CATALOG, standardId, "during")
                .filter((indicator) => indicator.gradeLevel === gradeLevel)
                .map((indicator) => indicator.id)
        )
    )
    const terminalIndicatorIds = unique(
        standardIds.flatMap((standardId) =>
            getIndicatorsForStandard(SECONDARY_CORE_CURRICULUM_INDICATOR_CATALOG, standardId, "terminal")
                .filter((indicator) => indicator.gradeLevel === gradeLevel)
                .map((indicator) => indicator.id)
        )
    )

    return {
        id: buildCourseId(definition.coreSubjectId, definition.id, gradeLevel),
        coreSubjectId: definition.coreSubjectId,
        courseCode: null,
        titleTh: definition.titleTh,
        titleEn: definition.titleEn,
        gradeLevel,
        semester: null,
        strandIds,
        standardIds,
        duringIndicatorIds,
        terminalIndicatorIds,
        descriptionText: resolveSecondaryCoreCourseDescription(definition, gradeLevel),
        sourceRegistryIds: unique([...subject.sourceRegistryIds, SECONDARY_CORE_DOCX_SOURCE_ID]),
        unitIds: definition.unitIds,
    }
}

function resolvePrimaryCoreSourceCourse(definition: PrimaryCoreCourseDefinition, gradeLevel: CanonicalGradeLevel) {
    return getPrimaryCoreCourse(PRIMARY_CORE_UNIT_ROWS_PAYLOAD, definition.titleTh, gradeLevel)
}

function resolvePrimaryCoreCourseDescription(
    definition: PrimaryCoreCourseDefinition,
    gradeLevel: CanonicalGradeLevel,
    sourceCourse: PrimaryCoreUnitCourse | null
) {
    const sourceDescription = sourceCourse?.descriptionText?.trim()
    if (sourceDescription) {
        return sourceDescription
    }
    const units = sourceCourse?.units ?? getPrimaryCoreUnitsForCourse(PRIMARY_CORE_UNIT_ROWS_PAYLOAD, definition.titleTh, gradeLevel)
    const summaries = units
        .map((unit) => unit.summary?.trim())
        .filter((summary): summary is string => Boolean(summary))
        .slice(0, 3)

    return summaries.length > 0
        ? summaries.join("\n\n")
        : `โครงสร้างรายวิชาพื้นฐานระดับประถมศึกษา ${definition.titleTh}`
}

function buildPrimaryCourseEntryFromDefinition(
    definition: PrimaryCoreCourseDefinition,
    gradeLevel: CanonicalGradeLevel
): CanonicalCourseEntry {
    const subject = getCanonicalSubjectById(definition.coreSubjectId)
    if (!subject) {
        throw new Error(`Missing canonical subject metadata for ${definition.coreSubjectId}`)
    }
    const pack = getSubjectCurriculumMapPack(definition.coreSubjectId)
    if (!pack) {
        throw new Error(`Missing curriculum map pack for ${definition.coreSubjectId}`)
    }
    const gradeBand = getGradeBandForLevel(gradeLevel)
    const units = pack.unitOutlines.filter((unit) => unit.gradeLevels.includes(gradeLevel) || unit.gradeBands.includes(gradeBand))
    const fallbackUnits = units.length > 0 ? units : pack.unitOutlines
    const sourceCourse = resolvePrimaryCoreSourceCourse(definition, gradeLevel)
    const crosswalkStandards = sourceCourse?.indicatorCrosswalkRows
        .map((row) => getCurriculumStandardByCode(row.standardCode))
        .filter((standard): standard is NonNullable<typeof standard> => Boolean(standard)) ?? []
    const standardIds = unique(
        crosswalkStandards.length > 0
            ? crosswalkStandards.map((standard) => standard.id)
            : fallbackUnits.flatMap((unit) => unit.standardIds)
    )
    const strandIds = unique(
        crosswalkStandards.length > 0
            ? crosswalkStandards.map((standard) => standard.strandId)
            : fallbackUnits.map((unit) => unit.strandId)
    )

    return {
        id: buildCourseId(definition.coreSubjectId, definition.id, gradeLevel),
        coreSubjectId: definition.coreSubjectId,
        courseCode: null,
        titleTh: definition.titleTh,
        titleEn: definition.titleEn,
        gradeLevel,
        semester: null,
        strandIds,
        standardIds,
        duringIndicatorIds: [],
        terminalIndicatorIds: [],
        descriptionText: resolvePrimaryCoreCourseDescription(definition, gradeLevel, sourceCourse),
        sourceRegistryIds: unique([...subject.sourceRegistryIds, PRIMARY_CORE_DOCX_SOURCE_ID]),
        unitIds: fallbackUnits.map((unit) => unit.id),
    }
}

function buildPhysicsAdditionalCourseEntries(): CanonicalCourseEntry[] {
    return buildAdditionalCourseEntries("physics", "ฟิสิกส์เพิ่มเติม", "Additional Physics", PHYSICS_ADDITIONAL_UPPER_SECONDARY_COURSES)
}

type AdditionalUpperSecondaryCourseSource = {
    id: string
    gradeLevel: CanonicalGradeLevel
    semester: 1 | 2
    bookTitle: string
    hours: number
    sourceFile: string
    descriptionText: string
    units: ReadonlyArray<{ id: string; title: string }>
}

function buildAdditionalCourseEntries(
    subjectId: CanonicalSubjectId,
    titlePrefixTh: string,
    titlePrefixEn: string,
    courses: readonly AdditionalUpperSecondaryCourseSource[]
): CanonicalCourseEntry[] {
    const subject = getCanonicalSubjectById(subjectId)
    if (!subject) {
        throw new Error(`Missing canonical subject metadata for ${subjectId}`)
    }
    const pack = getSubjectCurriculumMapPack(subjectId)
    if (!pack) {
        throw new Error(`Missing curriculum map pack for ${subjectId}`)
    }

    return courses.map((course) => {
        const units = course.units.map((unit) => {
            const unitOutline = pack.unitOutlines.find((candidate) => candidate.id === unit.id)
            if (!unitOutline) {
                throw new Error(`Missing curriculum unit ${subjectId}:${unit.id}`)
            }
            return unitOutline
        })
        const standardIds = unique(units.flatMap((unit) => unit.standardIds))
        const strandIds = unique(units.map((unit) => unit.strandId))
        return {
            id: buildAdditionalCourseId(subjectId, course.id, course.gradeLevel, course.semester),
            coreSubjectId: subjectId,
            courseCode: null,
            titleTh: `${titlePrefixTh} ${course.bookTitle} ภาคเรียนที่ ${course.semester}`,
            titleEn: `${titlePrefixEn} ${course.bookTitle} Semester ${course.semester}`,
            gradeLevel: course.gradeLevel,
            semester: course.semester,
            strandIds,
            standardIds,
            duringIndicatorIds: [],
            terminalIndicatorIds: [],
            descriptionText: course.descriptionText,
            sourceRegistryIds: subject.sourceRegistryIds,
            unitIds: course.units.map((unit) => unit.id),
        } satisfies CanonicalCourseEntry
    })
}

function buildCanonicalCourseCatalog(): CanonicalCourseCatalog {
    const secondaryCourses = SECONDARY_CORE_COURSE_DEFINITIONS.flatMap((definition) => {
        const eligibleGrades = definition.gradeLevels
            ? SECONDARY_GRADE_LEVELS.filter((g) => definition.gradeLevels!.includes(g))
            : SECONDARY_GRADE_LEVELS.filter((g) => definition.gradeBands.includes(getGradeBandForLevel(g)))
        return eligibleGrades.map((gradeLevel) => buildCourseEntryFromDefinition(definition, gradeLevel))
    })
    const primaryCourses = PRIMARY_CORE_COURSE_DEFINITIONS.flatMap((definition) =>
        PRIMARY_GRADE_LEVELS.map((gradeLevel) => buildPrimaryCourseEntryFromDefinition(definition, gradeLevel))
    )
    return [
        ...primaryCourses,
        ...secondaryCourses,
        ...buildPhysicsAdditionalCourseEntries(),
        ...buildAdditionalCourseEntries("chemistry", "เคมีเพิ่มเติม", "Additional Chemistry", CHEM_ADDITIONAL_UPPER_SECONDARY_COURSES),
        ...buildAdditionalCourseEntries("biology", "ชีววิทยาเพิ่มเติม", "Additional Biology", BIO_ADDITIONAL_UPPER_SECONDARY_COURSES),
        ...buildAdditionalCourseEntries(
            "earth_space_science",
            "โลก ดาราศาสตร์ และอวกาศเพิ่มเติม",
            "Additional Earth and Space Science",
            EARTH_ADDITIONAL_UPPER_SECONDARY_COURSES
        ),
    ]
}

export const CANONICAL_COURSE_CATALOG: CanonicalCourseCatalog = buildCanonicalCourseCatalog()

const PRIMARY_CORE_DEFINITIONS_BY_ID = new Map(
    PRIMARY_CORE_COURSE_DEFINITIONS.map((definition) => [definition.id, definition])
)

function isPrimaryGradeLevel(gradeLevel: CanonicalGradeLevel): gradeLevel is (typeof PRIMARY_GRADE_LEVELS)[number] {
    return (PRIMARY_GRADE_LEVELS as readonly CanonicalGradeLevel[]).includes(gradeLevel)
}

const SECONDARY_CORE_DEFINITIONS_BY_ID = new Map(
    SECONDARY_CORE_COURSE_DEFINITIONS.map((definition) => [definition.id, definition])
)

/**
 * Returns the real DOCX-sourced learning units (หน่วยการเรียนรู้) for a canonical
 * course entry, resolved by the same source title the descriptions use.
 */
export function getSecondaryCoreCourseUnits(course: CanonicalCourseEntry): SecondaryCoreUnit[] {
    const definitionId = course.id.split(":")[1] ?? ""
    const primaryDefinition = PRIMARY_CORE_DEFINITIONS_BY_ID.get(definitionId)
    if (primaryDefinition && isPrimaryGradeLevel(course.gradeLevel)) {
        return getPrimaryCoreUnitsForCourse(PRIMARY_CORE_UNIT_ROWS_PAYLOAD, primaryDefinition.titleTh, course.gradeLevel)
    }
    const definition = SECONDARY_CORE_DEFINITIONS_BY_ID.get(definitionId)
    if (!definition) {
        const pack = getSubjectCurriculumMapPack(course.coreSubjectId)
        if (!pack) return []
        const unitsById = new Map(pack.unitOutlines.map((unit) => [unit.id, unit]))
        const displayUnits: SecondaryCoreUnit[] = []
        course.unitIds.forEach((unitId, unitIndex) => {
            const unit = unitsById.get(unitId)
            if (!unit) return
            displayUnits.push({
                unitNumber: unitIndex + 1,
                title: unit.title,
                hours: unit.estimatedHours,
                duringIndicators: [],
                terminalIndicators: [],
                summary: unit.keyConceptTh,
            })
        })
        return displayUnits
    }
    const sourceTitleTh = resolveSecondaryCoreSourceTitle(definition, course.gradeLevel)
    return getSecondaryCoreUnitsForCourse(SECONDARY_CORE_UNIT_ROWS_PAYLOAD, sourceTitleTh, course.gradeLevel)
}

export function getPrimaryCoreCourseIndicatorCrosswalkRows(
    course: CanonicalCourseEntry
): PrimaryCoreIndicatorCrosswalkRow[] {
    const definitionId = course.id.split(":")[1] ?? ""
    const primaryDefinition = PRIMARY_CORE_DEFINITIONS_BY_ID.get(definitionId)
    if (!primaryDefinition || !isPrimaryGradeLevel(course.gradeLevel)) {
        return []
    }
    return getPrimaryCoreIndicatorCrosswalkRowsForCourse(
        PRIMARY_CORE_UNIT_ROWS_PAYLOAD,
        primaryDefinition.titleTh,
        course.gradeLevel
    )
}

function sourceRegistryIdExists(sourceRegistryId: string) {
    return BASIC_EDUCATION_CURRICULUM_SOURCE_REGISTRY.some((entry) => entry.id === sourceRegistryId)
}

function hasUniqueValues(values: string[]) {
    return new Set(values).size === values.length
}

export function validateCanonicalCourseCatalog(value: unknown) {
    const parsed = canonicalCourseCatalogSchema.safeParse(value)
    if (!parsed.success) {
        return parsed
    }

    const issues: z.ZodIssue[] = []
    const subjectMap = new Map([...getCanonicalCoreSubjects(), ...getCanonicalAdditionalSubjects()].map((subject) => [subject.id, subject]))
    const standardMap = new Map(CURRICULUM_STRAND_STANDARD_CATALOG.standards.map((standard) => [standard.id, standard]))
    const indicatorMap = new Map(
        SECONDARY_CORE_CURRICULUM_INDICATOR_CATALOG.indicators.map((indicator) => [indicator.id, indicator])
    )
    const unitMap = new Map(
        SUBJECT_CURRICULUM_MAP_PACKS.flatMap((pack) =>
            pack.unitOutlines.map((unit) => [`${pack.subjectId}:${unit.id}`, { subjectId: pack.subjectId, unit }] as const)
        )
    )

    if (!hasUniqueValues(parsed.data.map((entry) => entry.id))) {
        issues.push({
            code: z.ZodIssueCode.custom,
            message: "Canonical course ids must be unique.",
            path: [],
        })
    }

    parsed.data.forEach((entry, index) => {
        const subject = subjectMap.get(entry.coreSubjectId)
        if (!subject) {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "coreSubjectId must reference an existing canonical core subject.",
                path: [index, "coreSubjectId"],
            })
            return
        }

        if (!subject.gradeLevels.includes(entry.gradeLevel)) {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "gradeLevel must be supported by the selected core subject.",
                path: [index, "gradeLevel"],
            })
        }

        if (!hasUniqueValues(entry.strandIds)) {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "strandIds must not contain duplicates.",
                path: [index, "strandIds"],
            })
        }

        if (!hasUniqueValues(entry.standardIds)) {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "standardIds must not contain duplicates.",
                path: [index, "standardIds"],
            })
        }

        if (!hasUniqueValues(entry.duringIndicatorIds)) {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "duringIndicatorIds must not contain duplicates.",
                path: [index, "duringIndicatorIds"],
            })
        }

        if (!hasUniqueValues(entry.terminalIndicatorIds)) {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "terminalIndicatorIds must not contain duplicates.",
                path: [index, "terminalIndicatorIds"],
            })
        }

        if (!hasUniqueValues(entry.unitIds)) {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "unitIds must not contain duplicates.",
                path: [index, "unitIds"],
            })
        }

        entry.sourceRegistryIds.forEach((sourceRegistryId, sourceIndex) => {
            if (!sourceRegistryIdExists(sourceRegistryId)) {
                issues.push({
                    code: z.ZodIssueCode.custom,
                    message: "sourceRegistryIds must reference existing source registry entries.",
                    path: [index, "sourceRegistryIds", sourceIndex],
                })
            }
        })

        entry.standardIds.forEach((standardId, standardIndex) => {
            const standard = standardMap.get(standardId)
            if (!standard) {
                issues.push({
                    code: z.ZodIssueCode.custom,
                    message: "standardIds must reference existing curriculum standards.",
                    path: [index, "standardIds", standardIndex],
                })
                return
            }

            if (standard.subjectId !== entry.coreSubjectId) {
                issues.push({
                    code: z.ZodIssueCode.custom,
                    message: "standardIds must belong to the selected core subject.",
                    path: [index, "standardIds", standardIndex],
                })
            }
        })

        entry.unitIds.forEach((unitId, unitIndex) => {
            const unitRecord = unitMap.get(`${entry.coreSubjectId}:${unitId}`)
            if (!unitRecord) {
                issues.push({
                    code: z.ZodIssueCode.custom,
                    message: "unitIds must reference an existing subject curriculum unit.",
                    path: [index, "unitIds", unitIndex],
                })
                return
            }

            if (!unitRecord.unit.gradeLevels.includes(entry.gradeLevel)) {
                issues.push({
                    code: z.ZodIssueCode.custom,
                    message: "unitIds must support the selected gradeLevel.",
                    path: [index, "unitIds", unitIndex],
                })
            }
        })

        ;([
            ["duringIndicatorIds", "during"],
            ["terminalIndicatorIds", "terminal"],
        ] as const).forEach(([field, expectedType]) => {
            entry[field].forEach((indicatorId, indicatorIndex) => {
                const indicator = indicatorMap.get(indicatorId)
                if (!indicator) {
                    issues.push({
                        code: z.ZodIssueCode.custom,
                        message: `${field} must reference existing curriculum indicators.`,
                        path: [index, field, indicatorIndex],
                    })
                    return
                }

                if (indicator.subjectId !== entry.coreSubjectId) {
                    issues.push({
                        code: z.ZodIssueCode.custom,
                        message: `${field} must belong to the selected core subject.`,
                        path: [index, field, indicatorIndex],
                    })
                }

                if (indicator.gradeLevel !== entry.gradeLevel) {
                    issues.push({
                        code: z.ZodIssueCode.custom,
                        message: `${field} must match the selected gradeLevel.`,
                        path: [index, field, indicatorIndex],
                    })
                }

                if (indicator.indicatorType !== expectedType) {
                    issues.push({
                        code: z.ZodIssueCode.custom,
                        message: `${field} must contain only ${expectedType} indicators.`,
                        path: [index, field, indicatorIndex],
                    })
                }

                if (!entry.standardIds.includes(indicator.standardId)) {
                    issues.push({
                        code: z.ZodIssueCode.custom,
                        message: `${field} must belong to one of the course standardIds.`,
                        path: [index, field, indicatorIndex],
                    })
                }
            })
        })
    })

    if (issues.length === 0) {
        return {
            success: true as const,
            data: parsed.data,
        }
    }

    return {
        success: false as const,
        error: new z.ZodError(issues),
    }
}

export function isCanonicalCourseCatalog(value: unknown): value is CanonicalCourseCatalog {
    return validateCanonicalCourseCatalog(value).success
}

export function getCanonicalCourseById(courseId: string) {
    return CANONICAL_COURSE_CATALOG.find((entry) => entry.id === courseId) ?? null
}

export function getCanonicalCoursesForSubject(coreSubjectId: CanonicalSubjectId) {
    return CANONICAL_COURSE_CATALOG.filter((entry) => entry.coreSubjectId === coreSubjectId)
}

export function getCanonicalCoursesForSubjectAndGrade(
    coreSubjectId: CanonicalSubjectId,
    gradeLevel?: CanonicalGradeLevel | null
) {
    return getCanonicalCoursesForSubject(coreSubjectId).filter(
        (entry) => gradeLevel === undefined || gradeLevel === null || entry.gradeLevel === gradeLevel
    )
}

export function getCanonicalCourseOptions(coreSubjectId: CanonicalSubjectId, gradeLevel?: CanonicalGradeLevel | null) {
    return getCanonicalCoursesForSubjectAndGrade(coreSubjectId, gradeLevel).sort((left, right) =>
        left.titleTh.localeCompare(right.titleTh, "th")
    )
}
