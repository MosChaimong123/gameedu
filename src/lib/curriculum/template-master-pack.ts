import { z } from "zod"
import { curriculumSourceRefSchema, type CurriculumSourceRef } from "@/lib/curriculum/source-registry"
import { getSubjectCurriculumMapPack } from "@/lib/curriculum/map-packs"
import {
    getSubjectUnitLearningOutcomePack,
    validateSubjectUnitOutcomeSelection,
} from "@/lib/curriculum/unit-learning-outcomes"
import {
    canonicalCoreSubjectIdSchema,
    getCanonicalSubjectById,
    type CanonicalCoreSubjectId,
} from "@/lib/curriculum/subject-catalog"

export const SUBJECT_TEMPLATE_MASTER_PACK_SCHEMA_VERSION = "subject_template_master_pack_v1" as const

export const subjectTemplatePedagogySchema = z.enum(["video_first", "document_first", "practice_first"])
export const subjectTemplateBlockTypeSchema = z.enum([
    "objectives",
    "topics",
    "instruction",
    "practice",
    "media",
    "documents",
    "summary",
    "assessment_bridge",
])
export const subjectTemplateMediaKindSchema = z.enum(["video", "image", "simulation", "audio", "slide", "document"])
export const subjectTemplateDocumentKindSchema = z.enum(["worksheet", "reference", "slide", "reading_note"])

export const subjectTemplateMediaRequirementSchema = z.object({
    kind: subjectTemplateMediaKindSchema,
    minCount: z.number().int().min(0),
    notes: z.array(z.string().trim().min(1)).default([]),
})

export const subjectTemplateDocumentRequirementSchema = z.object({
    kind: subjectTemplateDocumentKindSchema,
    minCount: z.number().int().min(0),
    notes: z.array(z.string().trim().min(1)).default([]),
})

export const subjectTemplateTeacherOverrideSchema = z.object({
    allowTitleOverride: z.boolean(),
    allowTopicReorder: z.boolean(),
    allowTopicAppend: z.boolean(),
    allowMediaSwap: z.boolean(),
    allowDocumentSwap: z.boolean(),
    allowOutcomeTrim: z.boolean(),
    notes: z.array(z.string().trim().min(1)).default([]),
})

export const subjectLessonTemplateTopicSchema = z.object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    topicIds: z.array(z.string().trim().min(1)).min(1),
    outcomeIds: z.array(z.string().trim().min(1)).min(1),
    blockOrder: z.array(subjectTemplateBlockTypeSchema).min(1),
    mediaFocus: z.array(subjectTemplateMediaKindSchema).default([]),
})

export const subjectLessonTemplateSchema = z.object({
    id: z.string().trim().min(1),
    subjectId: canonicalCoreSubjectIdSchema,
    unitId: z.string().trim().min(1),
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    pedagogy: subjectTemplatePedagogySchema,
    estimatedMinutes: z.number().int().min(1),
    requiredBlocks: z.array(subjectTemplateBlockTypeSchema).min(1),
    suggestedOutcomeIds: z.array(z.string().trim().min(1)).min(1),
    topicStructure: z.array(subjectLessonTemplateTopicSchema).min(1),
    mediaRequirements: z.array(subjectTemplateMediaRequirementSchema).default([]),
    documentRequirements: z.array(subjectTemplateDocumentRequirementSchema).default([]),
    teacherOverrides: subjectTemplateTeacherOverrideSchema,
    sourceRefs: z.array(curriculumSourceRefSchema).min(1),
})

export const subjectLessonTemplatePackSchema = z.object({
    schemaVersion: z.literal(SUBJECT_TEMPLATE_MASTER_PACK_SCHEMA_VERSION),
    subjectId: canonicalCoreSubjectIdSchema,
    displayNameTh: z.string().trim().min(1),
    displayNameEn: z.string().trim().min(1),
    packStatus: z.enum(["starter_master_pack"]),
    templates: z.array(subjectLessonTemplateSchema).min(1),
    sourceRefs: z.array(curriculumSourceRefSchema).min(1),
})

export const subjectLessonTemplateCatalogSchema = z.array(subjectLessonTemplatePackSchema).min(1)

export type SubjectTemplatePedagogy = z.infer<typeof subjectTemplatePedagogySchema>
export type SubjectTemplateBlockType = z.infer<typeof subjectTemplateBlockTypeSchema>
export type SubjectTemplateMediaRequirement = z.infer<typeof subjectTemplateMediaRequirementSchema>
export type SubjectTemplateDocumentRequirement = z.infer<typeof subjectTemplateDocumentRequirementSchema>
export type SubjectTemplateTeacherOverride = z.infer<typeof subjectTemplateTeacherOverrideSchema>
export type SubjectLessonTemplateTopic = z.infer<typeof subjectLessonTemplateTopicSchema>
export type SubjectLessonTemplate = z.infer<typeof subjectLessonTemplateSchema>
export type SubjectLessonTemplatePack = z.infer<typeof subjectLessonTemplatePackSchema>
export type SubjectLessonTemplateCatalog = z.infer<typeof subjectLessonTemplateCatalogSchema>

const PLATFORM_TEMPLATE_REF: CurriculumSourceRef = {
    provider: "platform",
    title: "TeachPlayEdu subject template master pack",
    usage: "platform_sequence",
}

type SubjectTemplateConfig = {
    title: string
    description: string
    pedagogy: SubjectTemplatePedagogy
    estimatedMinutes: number
    requiredBlocks: SubjectTemplateBlockType[]
    topicBlockOrder: SubjectTemplateBlockType[]
    mediaRequirements: SubjectTemplateMediaRequirement[]
    documentRequirements: SubjectTemplateDocumentRequirement[]
    teacherOverrides: SubjectTemplateTeacherOverride
}

const SUBJECT_TEMPLATE_CONFIGS: Record<CanonicalCoreSubjectId, SubjectTemplateConfig> = {
    thai: {
        title: "แม่แบบบทเรียนอ่านและสื่อสารจากเนื้อหาแกนกลาง",
        description: "เหมาะกับบทเรียนที่ครูต้องการเริ่มจากเอกสารการอ่าน แล้วค่อยพาอภิปราย เขียนสรุป และต่อยอดสู่การประเมินรายหัวข้อ",
        pedagogy: "document_first",
        estimatedMinutes: 55,
        requiredBlocks: ["objectives", "topics", "documents", "instruction", "practice", "summary", "assessment_bridge"],
        topicBlockOrder: ["objectives", "documents", "instruction", "practice", "summary"],
        mediaRequirements: [{ kind: "image", minCount: 1, notes: ["ภาพกระตุ้นการอ่านหรือภาพประกอบข้อความ"] }],
        documentRequirements: [
            { kind: "reference", minCount: 1, notes: ["บทอ่านหรือข้อความหลักของบทเรียน"] },
            { kind: "worksheet", minCount: 1, notes: ["ใบงานสรุปหรือใบตอบคำถาม"] },
        ],
        teacherOverrides: {
            allowTitleOverride: true,
            allowTopicReorder: true,
            allowTopicAppend: true,
            allowMediaSwap: true,
            allowDocumentSwap: true,
            allowOutcomeTrim: true,
            notes: ["ครูสามารถสลับบทอ่านให้เหมาะกับระดับชั้นจริงได้"],
        },
    },
    mathematics: {
        title: "แม่แบบบทเรียนฝึกคิดและลงมือแก้โจทย์",
        description: "เหมาะกับบทเรียนคณิตที่เริ่มจากแนวคิดสั้น แล้วให้นักเรียนลงมือทำแบบฝึกหลายช่วงพร้อมเฉลยสะท้อนวิธีคิด",
        pedagogy: "practice_first",
        estimatedMinutes: 60,
        requiredBlocks: ["objectives", "topics", "instruction", "practice", "summary", "assessment_bridge"],
        topicBlockOrder: ["objectives", "instruction", "practice", "summary"],
        mediaRequirements: [{ kind: "slide", minCount: 1, notes: ["ใช้สรุปวิธีทำหรือรูปแบบโจทย์"] }],
        documentRequirements: [{ kind: "worksheet", minCount: 1, notes: ["ชุดโจทย์ฝึกระหว่างเรียน"] }],
        teacherOverrides: {
            allowTitleOverride: true,
            allowTopicReorder: false,
            allowTopicAppend: true,
            allowMediaSwap: true,
            allowDocumentSwap: true,
            allowOutcomeTrim: false,
            notes: ["คงลำดับทักษะจากง่ายไปยากเพื่อรักษา progression"],
        },
    },
    science_technology: {
        title: "แม่แบบบทเรียนทดลองและสื่ออธิบายปรากฏการณ์",
        description: "เหมาะกับวิทยาศาสตร์และเทคโนโลยีที่เปิดด้วยคลิปหรือสื่อสาธิต แล้วพาเชื่อมแนวคิด การลงมือทำ และคำถามตรวจความเข้าใจ",
        pedagogy: "video_first",
        estimatedMinutes: 60,
        requiredBlocks: ["objectives", "topics", "media", "instruction", "practice", "summary", "assessment_bridge"],
        topicBlockOrder: ["objectives", "media", "instruction", "practice", "summary"],
        mediaRequirements: [
            { kind: "video", minCount: 1, notes: ["คลิปหรือเดโมเปิดบท"] },
            { kind: "simulation", minCount: 1, notes: ["สื่อทดลองหรือ interactive"] },
        ],
        documentRequirements: [{ kind: "worksheet", minCount: 1, notes: ["ใบสังเกตหรือบันทึกผล"] }],
        teacherOverrides: {
            allowTitleOverride: true,
            allowTopicReorder: true,
            allowTopicAppend: true,
            allowMediaSwap: true,
            allowDocumentSwap: true,
            allowOutcomeTrim: true,
            notes: ["สลับสื่อทดลองได้ตามอุปกรณ์จริงของห้องเรียน"],
        },
    },
    social_religion_culture: {
        title: "แม่แบบบทเรียนอ่านตีความและเชื่อมบริบทสังคม",
        description: "ใช้เอกสารอ้างอิง กรณีศึกษา หรือแหล่งข้อมูลร่วมกับการอภิปรายและงานสะท้อนคิด",
        pedagogy: "document_first",
        estimatedMinutes: 55,
        requiredBlocks: ["objectives", "topics", "documents", "instruction", "summary", "assessment_bridge"],
        topicBlockOrder: ["objectives", "documents", "instruction", "summary"],
        mediaRequirements: [{ kind: "image", minCount: 1, notes: ["แผนที่ เส้นเวลา หรือภาพเหตุการณ์"] }],
        documentRequirements: [{ kind: "reference", minCount: 1, notes: ["กรณีศึกษา ข้อความ หรือแหล่งข้อมูลอ้างอิง"] }],
        teacherOverrides: {
            allowTitleOverride: true,
            allowTopicReorder: true,
            allowTopicAppend: true,
            allowMediaSwap: true,
            allowDocumentSwap: true,
            allowOutcomeTrim: true,
            notes: ["ครูสามารถแทรกเหตุการณ์ร่วมสมัยในชุมชนตนเองได้"],
        },
    },
    health_physical_education: {
        title: "แม่แบบบทเรียนสาธิตทักษะและฝึกปฏิบัติ",
        description: "เปิดด้วยวิดีโอหรือภาพการเคลื่อนไหว แล้วให้นักเรียนลงมือฝึก ปฏิบัติ และสะท้อนการดูแลตนเอง",
        pedagogy: "video_first",
        estimatedMinutes: 50,
        requiredBlocks: ["objectives", "topics", "media", "practice", "summary", "assessment_bridge"],
        topicBlockOrder: ["objectives", "media", "practice", "summary"],
        mediaRequirements: [
            { kind: "video", minCount: 1, notes: ["คลิปสาธิตทักษะหรือกิจกรรม"] },
            { kind: "image", minCount: 1, notes: ["ภาพท่าทางหรือขั้นตอนสำคัญ"] },
        ],
        documentRequirements: [{ kind: "worksheet", minCount: 1, notes: ["แบบบันทึกการฝึกหรือการประเมินตนเอง"] }],
        teacherOverrides: {
            allowTitleOverride: true,
            allowTopicReorder: false,
            allowTopicAppend: true,
            allowMediaSwap: true,
            allowDocumentSwap: true,
            allowOutcomeTrim: true,
            notes: ["ลำดับสื่อและปฏิบัติควรสัมพันธ์กับความปลอดภัย"],
        },
    },
    arts: {
        title: "แม่แบบบทเรียนดูตัวอย่างแล้วสร้างงานของตนเอง",
        description: "เหมาะกับศิลปะ ดนตรี และการแสดงที่ดูตัวอย่างก่อน แล้วค่อยลงมือสร้างผลงานหรือฝึกปฏิบัติ",
        pedagogy: "practice_first",
        estimatedMinutes: 60,
        requiredBlocks: ["objectives", "topics", "media", "practice", "summary", "assessment_bridge"],
        topicBlockOrder: ["objectives", "media", "practice", "summary"],
        mediaRequirements: [
            { kind: "image", minCount: 1, notes: ["ตัวอย่างงานศิลป์หรือภาพอ้างอิง"] },
            { kind: "audio", minCount: 1, notes: ["ใช้สำหรับดนตรีหรือจังหวะเมื่อเหมาะสม"] },
        ],
        documentRequirements: [{ kind: "reference", minCount: 1, notes: ["โจทย์งานหรือเกณฑ์ประเมินผลงาน"] }],
        teacherOverrides: {
            allowTitleOverride: true,
            allowTopicReorder: true,
            allowTopicAppend: true,
            allowMediaSwap: true,
            allowDocumentSwap: true,
            allowOutcomeTrim: true,
            notes: ["ครูสามารถเปลี่ยนชิ้นงานปลายทางให้เข้ากับบริบทได้"],
        },
    },
    career: {
        title: "แม่แบบบทเรียนทักษะอาชีพและชิ้นงานจริง",
        description: "เน้นการลงมือทำจากโจทย์งานจริง เชื่อมสื่อสาธิต เอกสารขั้นตอน และผลลัพธ์ที่ประเมินได้",
        pedagogy: "practice_first",
        estimatedMinutes: 60,
        requiredBlocks: ["objectives", "topics", "media", "documents", "practice", "summary", "assessment_bridge"],
        topicBlockOrder: ["objectives", "media", "documents", "practice", "summary"],
        mediaRequirements: [{ kind: "video", minCount: 1, notes: ["สื่อสาธิตขั้นตอนทำงาน"] }],
        documentRequirements: [
            { kind: "worksheet", minCount: 1, notes: ["ใบงานหรือ checklist ขั้นตอน"] },
            { kind: "reference", minCount: 1, notes: ["ตัวอย่างชิ้นงานหรือข้อมูลต้นแบบ"] },
        ],
        teacherOverrides: {
            allowTitleOverride: true,
            allowTopicReorder: true,
            allowTopicAppend: true,
            allowMediaSwap: true,
            allowDocumentSwap: true,
            allowOutcomeTrim: true,
            notes: ["ครูปรับโจทย์ชิ้นงานให้ตรงทรัพยากรของโรงเรียนได้"],
        },
    },
    foreign_languages: {
        title: "แม่แบบบทเรียนสื่อสารผ่านคลิป เสียง และภารกิจภาษา",
        description: "เหมาะกับการเรียนภาษาที่ใช้สื่อเสียงหรือวิดีโอเป็นตัวตั้ง แล้วตามด้วยกิจกรรมพูด อ่าน เขียน รายหัวข้อ",
        pedagogy: "video_first",
        estimatedMinutes: 55,
        requiredBlocks: ["objectives", "topics", "media", "practice", "summary", "assessment_bridge"],
        topicBlockOrder: ["objectives", "media", "practice", "summary"],
        mediaRequirements: [
            { kind: "video", minCount: 1, notes: ["คลิปบทสนทนาหรือสถานการณ์ภาษา"] },
            { kind: "audio", minCount: 1, notes: ["ไฟล์เสียงสำหรับฟังจับใจความหรือฝึกออกเสียง"] },
        ],
        documentRequirements: [{ kind: "worksheet", minCount: 1, notes: ["ใบงานคำศัพท์หรือภารกิจภาษา"] }],
        teacherOverrides: {
            allowTitleOverride: true,
            allowTopicReorder: true,
            allowTopicAppend: true,
            allowMediaSwap: true,
            allowDocumentSwap: true,
            allowOutcomeTrim: true,
            notes: ["ครูสามารถเปลี่ยนสถานการณ์ภาษาให้เข้ากับระดับผู้เรียนได้"],
        },
    },
}

function unique(values: string[]) {
    return new Set(values).size === values.length
}

function buildStarterTemplatePack(subjectId: CanonicalCoreSubjectId): SubjectLessonTemplatePack {
    const subject = getCanonicalSubjectById(subjectId)
    const mapPack = getSubjectCurriculumMapPack(subjectId)
    const unit = mapPack?.unitOutlines[0]
    const config = SUBJECT_TEMPLATE_CONFIGS[subjectId]

    if (!subject || !mapPack || !unit || !config) {
        throw new Error(`Missing starter template dependencies for ${subjectId}`)
    }

    const outcomePack = getSubjectUnitLearningOutcomePack(subjectId, unit.id)
    if (!outcomePack) {
        throw new Error(`Missing starter outcome pack for ${subjectId}:${unit.id}`)
    }

    const selectedTopics = outcomePack.topics.slice(0, Math.min(2, outcomePack.topics.length))
    const topicStructure = selectedTopics.map((topic, index) => {
        const outcomeIds = outcomePack.learningOutcomes.filter((outcome) => outcome.topicIds.includes(topic.id)).map((outcome) => outcome.id)
        if (outcomeIds.length === 0) {
            throw new Error(`Missing topic outcome mapping for ${subjectId}:${unit.id}:${topic.id}`)
        }

        return {
            id: `${subjectId}-tpl-topic-${index + 1}`,
            title: topic.title,
            topicIds: [topic.id],
            outcomeIds,
            blockOrder: [...config.topicBlockOrder],
            mediaFocus: config.mediaRequirements.map((requirement) => requirement.kind),
        }
    })

    const suggestedOutcomeIds = Array.from(new Set(topicStructure.flatMap((topic) => topic.outcomeIds)))

    return {
        schemaVersion: SUBJECT_TEMPLATE_MASTER_PACK_SCHEMA_VERSION,
        subjectId,
        displayNameTh: subject.displayNameTh,
        displayNameEn: subject.displayNameEn,
        packStatus: "starter_master_pack",
        sourceRefs: [...mapPack.sourceRefs, PLATFORM_TEMPLATE_REF],
        templates: [
            {
                id: `${subjectId}-master-template-01`,
                subjectId,
                unitId: unit.id,
                title: config.title,
                description: config.description,
                pedagogy: config.pedagogy,
                estimatedMinutes: config.estimatedMinutes,
                requiredBlocks: [...config.requiredBlocks],
                suggestedOutcomeIds,
                topicStructure,
                mediaRequirements: config.mediaRequirements,
                documentRequirements: config.documentRequirements,
                teacherOverrides: config.teacherOverrides,
                sourceRefs: [...unit.sourceRefs, PLATFORM_TEMPLATE_REF],
            },
        ],
    }
}

export const SUBJECT_TEMPLATE_MASTER_PACKS: SubjectLessonTemplateCatalog = [
    buildStarterTemplatePack("thai"),
    buildStarterTemplatePack("mathematics"),
    buildStarterTemplatePack("science_technology"),
    buildStarterTemplatePack("social_religion_culture"),
    buildStarterTemplatePack("health_physical_education"),
    buildStarterTemplatePack("arts"),
    buildStarterTemplatePack("career"),
    buildStarterTemplatePack("foreign_languages"),
]

export function validateSubjectLessonTemplateCatalog(value: unknown) {
    const parsed = subjectLessonTemplateCatalogSchema.safeParse(value)
    if (!parsed.success) {
        return parsed
    }

    const issues: z.ZodIssue[] = []
    const subjectIds = parsed.data.map((pack) => pack.subjectId)
    const templateIds = parsed.data.flatMap((pack) => pack.templates.map((template) => template.id))

    if (!unique(subjectIds)) {
        issues.push({
            code: z.ZodIssueCode.custom,
            message: "Subject template master packs must contain unique subject ids.",
            path: [],
        })
    }

    if (!unique(templateIds)) {
        issues.push({
            code: z.ZodIssueCode.custom,
            message: "Subject lesson template ids must be globally unique.",
            path: [],
        })
    }

    parsed.data.forEach((pack, packIndex) => {
        pack.templates.forEach((template, templateIndex) => {
            if (template.subjectId !== pack.subjectId) {
                issues.push({
                    code: z.ZodIssueCode.custom,
                    message: "Template subjectId must match its parent pack subjectId.",
                    path: [packIndex, "templates", templateIndex, "subjectId"],
                })
            }

            if (!unique(template.requiredBlocks)) {
                issues.push({
                    code: z.ZodIssueCode.custom,
                    message: "requiredBlocks must not contain duplicates.",
                    path: [packIndex, "templates", templateIndex, "requiredBlocks"],
                })
            }

            const primaryOutcomeId = template.suggestedOutcomeIds[0]
            const supportingOutcomeIds = template.suggestedOutcomeIds.slice(1)
            const selection = validateSubjectUnitOutcomeSelection({
                subjectId: template.subjectId,
                unitId: template.unitId,
                primaryOutcomeId,
                supportingOutcomeIds,
            })

            if (!selection.ok) {
                issues.push({
                    code: z.ZodIssueCode.custom,
                    message: `Suggested outcome ids are invalid for ${template.subjectId}:${template.unitId}.`,
                    path: [packIndex, "templates", templateIndex, "suggestedOutcomeIds"],
                })
            }

            const outcomePack = getSubjectUnitLearningOutcomePack(template.subjectId, template.unitId)
            if (!outcomePack) {
                issues.push({
                    code: z.ZodIssueCode.custom,
                    message: "Template unitId must resolve to a known outcome pack.",
                    path: [packIndex, "templates", templateIndex, "unitId"],
                })
                return
            }

            const validTopicIds = new Set(outcomePack.topics.map((topic) => topic.id))
            const validOutcomeIds = new Set(outcomePack.learningOutcomes.map((outcome) => outcome.id))

            template.topicStructure.forEach((topic, topicIndex) => {
                topic.topicIds.forEach((topicId, topicIdIndex) => {
                    if (!validTopicIds.has(topicId)) {
                        issues.push({
                            code: z.ZodIssueCode.custom,
                            message: "topicStructure.topicIds must belong to the template unit.",
                            path: [packIndex, "templates", templateIndex, "topicStructure", topicIndex, "topicIds", topicIdIndex],
                        })
                    }
                })

                topic.outcomeIds.forEach((outcomeId, outcomeIdIndex) => {
                    if (!validOutcomeIds.has(outcomeId)) {
                        issues.push({
                            code: z.ZodIssueCode.custom,
                            message: "topicStructure.outcomeIds must belong to the template unit.",
                            path: [packIndex, "templates", templateIndex, "topicStructure", topicIndex, "outcomeIds", outcomeIdIndex],
                        })
                    }
                })
            })
        })
    })

    if (issues.length === 0) {
        return { success: true as const, data: parsed.data }
    }

    return { success: false as const, error: new z.ZodError(issues) }
}

export function isSubjectLessonTemplateCatalog(value: unknown): value is SubjectLessonTemplateCatalog {
    return validateSubjectLessonTemplateCatalog(value).success
}

export function getSubjectLessonTemplatePack(subjectId: CanonicalCoreSubjectId) {
    return SUBJECT_TEMPLATE_MASTER_PACKS.find((pack) => pack.subjectId === subjectId) ?? null
}

export function listSubjectLessonTemplates(subjectId: CanonicalCoreSubjectId) {
    return getSubjectLessonTemplatePack(subjectId)?.templates ?? []
}

export function findSubjectLessonTemplate(templateId: string) {
    for (const pack of SUBJECT_TEMPLATE_MASTER_PACKS) {
        const template = pack.templates.find((entry) => entry.id === templateId)
        if (template) {
            return { pack, template }
        }
    }

    return null
}
