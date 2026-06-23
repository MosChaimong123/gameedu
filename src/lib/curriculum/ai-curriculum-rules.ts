import { z } from "zod"
import {
    findSubjectLessonTemplate,
    getSubjectLessonTemplatePack,
    type SubjectLessonTemplate,
} from "@/lib/curriculum/template-master-pack"
import {
    getSubjectUnitLearningOutcomePack,
    validateSubjectUnitOutcomeSelection,
    type SubjectUnitLearningOutcome,
    type SubjectUnitLearningOutcomePack,
    type SubjectUnitTopic,
} from "@/lib/curriculum/unit-learning-outcomes"
import { getSubjectCurriculumMapPack, type SubjectCurriculumUnitOutline } from "@/lib/curriculum/map-packs"
import {
    getCanonicalSubjectById,
    canonicalCoreSubjectIdSchema,
    type CanonicalCoreSubjectId,
    type CanonicalSubjectId,
    type CanonicalSubjectCatalogEntry,
} from "@/lib/curriculum/subject-catalog"
import type { LessonOutlineBatchDraft, LessonOutlineDraft, LessonTopicContentDraft } from "@/lib/lessons/lesson-content"

export const aiLessonCurriculumSelectionSchema = z.object({
    subjectId: canonicalCoreSubjectIdSchema,
    unitId: z.string().trim().min(1),
    templateId: z.string().trim().min(1).optional(),
    topicIds: z.array(z.string().trim().min(1)).min(1).optional(),
    learningOutcomeIds: z.array(z.string().trim().min(1)).min(1).optional(),
})

export type AILessonCurriculumSelection = z.infer<typeof aiLessonCurriculumSelectionSchema>

export type AILessonPromptFamily =
    | "language_literacy"
    | "stem_science"
    | "civic_humanities"
    | "wellbeing_movement"
    | "creative_performance"
    | "career_applied"

export type ResolvedCurriculumTopic = SubjectUnitTopic & {
    outcomeIds: string[]
    outcomeTexts: string[]
}

export type ResolvedAILessonCurriculumSelection = {
    subject: CanonicalSubjectCatalogEntry
    unit: SubjectCurriculumUnitOutline
    outcomePack: SubjectUnitLearningOutcomePack
    template: SubjectLessonTemplate | null
    promptFamily: AILessonPromptFamily
    selectedOutcomeIds: string[]
    selectedOutcomes: SubjectUnitLearningOutcome[]
    selectedTopics: ResolvedCurriculumTopic[]
}

export type CurriculumAlignmentIssue = {
    code:
        | "INVALID_SELECTION"
        | "SUBJECT_NOT_FOUND"
        | "UNIT_NOT_FOUND"
        | "TEMPLATE_NOT_FOUND"
        | "TEMPLATE_SUBJECT_MISMATCH"
        | "TEMPLATE_UNIT_MISMATCH"
        | "OUTCOME_PACK_NOT_FOUND"
        | "TOPIC_NOT_FOUND"
        | "TOPIC_OUTSIDE_TEMPLATE"
        | "OUTCOME_NOT_FOUND"
        | "OUTLINE_LESSON_COUNT"
        | "OUTLINE_TOPIC_NOT_ALLOWED"
        | "OUTLINE_EMPTY"
        | "TOPIC_CONTENT_TOPIC_MISMATCH"
    message: string
    topicId?: string
    outcomeId?: string
}

function unique(values: string[]) {
    return Array.from(new Set(values))
}

function mapPromptFamily(subjectId: CanonicalSubjectId): AILessonPromptFamily {
    switch (subjectId) {
        case "thai":
        case "foreign_languages":
            return "language_literacy"
        case "mathematics":
        case "science_technology":
        case "physics":
        case "chemistry":
        case "biology":
        case "earth_space_science":
            return "stem_science"
        case "social_religion_culture":
            return "civic_humanities"
        case "health_physical_education":
            return "wellbeing_movement"
        case "arts":
            return "creative_performance"
        case "career":
            return "career_applied"
    }
}

export function getPromptPolicyText(subjectId: CanonicalSubjectId) {
    const family = mapPromptFamily(subjectId)
    switch (family) {
        case "language_literacy":
            return "Keep explanations concise, vocabulary-aware, and suitable for reading, discussion, and writing practice."
        case "stem_science":
            return "Anchor every explanation to observable concepts, cause-effect reasoning, and step-by-step clarity."
        case "civic_humanities":
            return "Keep content evidence-based, contextual, and suitable for discussion, reflection, and interpretation."
        case "wellbeing_movement":
            return "Use short practical instructions, safety-aware wording, and concrete self-practice guidance."
        case "creative_performance":
            return "Balance demonstration, creation, and reflection. Keep room for teacher-led adaptation and student expression."
        case "career_applied":
            return "Emphasize real tasks, procedures, workplace habits, and outputs that can be practiced or demonstrated."
    }
}

export function validateAILessonCurriculumSelection(value: unknown) {
    return aiLessonCurriculumSelectionSchema.safeParse(value)
}

export function resolveAILessonCurriculumSelection(
    selection: AILessonCurriculumSelection
): { ok: true; data: ResolvedAILessonCurriculumSelection } | { ok: false; issues: CurriculumAlignmentIssue[] } {
    const subject = getCanonicalSubjectById(selection.subjectId)
    if (!subject) {
        return { ok: false, issues: [{ code: "SUBJECT_NOT_FOUND", message: "subjectId does not exist in canonical subject catalog." }] }
    }

    const mapPack = getSubjectCurriculumMapPack(selection.subjectId)
    const unit = mapPack?.unitOutlines.find((entry) => entry.id === selection.unitId)
    if (!unit) {
        return { ok: false, issues: [{ code: "UNIT_NOT_FOUND", message: "unitId does not exist in subject curriculum map pack." }] }
    }

    const outcomePack = getSubjectUnitLearningOutcomePack(selection.subjectId, selection.unitId)
    if (!outcomePack) {
        return { ok: false, issues: [{ code: "OUTCOME_PACK_NOT_FOUND", message: "No unit outcome pack exists for this subject/unit." }] }
    }

    let template: SubjectLessonTemplate | null = null
    if (selection.templateId) {
        const found = findSubjectLessonTemplate(selection.templateId)
        if (!found) {
            return { ok: false, issues: [{ code: "TEMPLATE_NOT_FOUND", message: "templateId does not exist in subject template packs." }] }
        }
        if (found.template.subjectId !== selection.subjectId) {
            return { ok: false, issues: [{ code: "TEMPLATE_SUBJECT_MISMATCH", message: "templateId belongs to a different subject." }] }
        }
        if (found.template.unitId !== selection.unitId) {
            return { ok: false, issues: [{ code: "TEMPLATE_UNIT_MISMATCH", message: "templateId belongs to a different unit." }] }
        }
        template = found.template
    }

    const templateTopicIds = template ? new Set(template.topicStructure.flatMap((topic) => topic.topicIds)) : null
    const requestedTopicIds = selection.topicIds?.length ? selection.topicIds : null
    const requestedOutcomeIds = selection.learningOutcomeIds?.length ? selection.learningOutcomeIds : null

    const selectedTopics: ResolvedCurriculumTopic[] = []
    for (const topic of outcomePack.topics) {
        if (templateTopicIds && !templateTopicIds.has(topic.id)) continue
        if (requestedTopicIds && !requestedTopicIds.includes(topic.id)) continue

        const mappedOutcomes = outcomePack.learningOutcomes.filter((outcome) => outcome.topicIds.includes(topic.id))
        const filteredOutcomeIds = requestedOutcomeIds
            ? mappedOutcomes.map((outcome) => outcome.id).filter((outcomeId) => requestedOutcomeIds.includes(outcomeId))
            : mappedOutcomes.map((outcome) => outcome.id)

        if (filteredOutcomeIds.length === 0) continue

        selectedTopics.push({
            ...topic,
            outcomeIds: filteredOutcomeIds,
            outcomeTexts: mappedOutcomes.filter((outcome) => filteredOutcomeIds.includes(outcome.id)).map((outcome) => outcome.text),
        })
    }

    const selectedTopicIds = selectedTopics.map((topic) => topic.id)
    const selectedOutcomeIds = unique(selectedTopics.flatMap((topic) => topic.outcomeIds))
    const selectedOutcomes = outcomePack.learningOutcomes.filter((outcome) => selectedOutcomeIds.includes(outcome.id))

    const issues: CurriculumAlignmentIssue[] = []

    if (requestedTopicIds) {
        requestedTopicIds.forEach((topicId) => {
            const exists = outcomePack.topics.some((topic) => topic.id === topicId)
            if (!exists) {
                issues.push({ code: "TOPIC_NOT_FOUND", message: "Requested topicId does not exist in the selected unit.", topicId })
                return
            }
            if (templateTopicIds && !templateTopicIds.has(topicId)) {
                issues.push({ code: "TOPIC_OUTSIDE_TEMPLATE", message: "Requested topicId is outside the selected template.", topicId })
            }
        })
    }

    if (requestedOutcomeIds) {
        requestedOutcomeIds.forEach((outcomeId, index) => {
            const selectionCheck = validateSubjectUnitOutcomeSelection({
                subjectId: selection.subjectId,
                unitId: selection.unitId,
                primaryOutcomeId: outcomeId,
                supportingOutcomeIds: requestedOutcomeIds.filter((_, outcomeIndex) => outcomeIndex !== index).slice(0, 1),
            })
            const exists = outcomePack.learningOutcomes.some((outcome) => outcome.id === outcomeId)
            if (!exists || !selectionCheck.ok) {
                issues.push({ code: "OUTCOME_NOT_FOUND", message: "Requested learningOutcomeId does not exist in the selected unit.", outcomeId })
            }
        })
    }

    if (selectedTopics.length === 0 || selectedOutcomes.length === 0) {
        issues.push({
            code: "INVALID_SELECTION",
            message: "Selection resolved to zero allowed topics or outcomes.",
        })
    }

    if (issues.length > 0) {
        return { ok: false, issues }
    }

    return {
        ok: true,
        data: {
            subject,
            unit,
            outcomePack,
            template,
            promptFamily: mapPromptFamily(selection.subjectId),
            selectedOutcomeIds,
            selectedOutcomes,
            selectedTopics: selectedTopics.filter((topic) => selectedTopicIds.includes(topic.id)),
        },
    }
}

export function buildOutlineCurriculumPromptContext(selection: ResolvedAILessonCurriculumSelection) {
    const templateContext = selection.template
        ? `
Selected template id: ${selection.template.id}
Selected template title: ${selection.template.title}
Template pedagogy: ${selection.template.pedagogy}
Required blocks: ${selection.template.requiredBlocks.join(", ")}`
        : ""

    const allowedTopics = selection.selectedTopics
        .map(
            (topic) => `- ${topic.id}: ${topic.title}
  Outcomes:
  ${topic.outcomeIds.map((outcomeId, index) => `* ${outcomeId}: ${topic.outcomeTexts[index] ?? ""}`).join("\n  ")}`
        )
        .join("\n")

    return `Canonical curriculum context:
Subject id: ${selection.subject.id}
Subject name: ${selection.subject.displayNameTh}
Unit id: ${selection.unit.id}
Unit title: ${selection.unit.title}
Prompt family: ${selection.promptFamily}
Policy: ${getPromptPolicyText(selection.subject.id)}
${templateContext}

Allowed unit topics (use only these topic ids and titles):
${allowedTopics}

Important curriculum rules:
- You must stay inside the selected unit only.
- You must use only allowed topic ids.
- You must not invent a new topic outside the allowed list.
- You must keep the generated lesson aligned to the listed outcomes only.`
}

export function buildTopicContentCurriculumPromptContext(
    selection: ResolvedAILessonCurriculumSelection,
    topicId: string
) {
    const topic = selection.selectedTopics.find((entry) => entry.id === topicId)
    if (!topic) {
        return null
    }

    return `Canonical curriculum context:
Subject id: ${selection.subject.id}
Subject name: ${selection.subject.displayNameTh}
Unit id: ${selection.unit.id}
Unit title: ${selection.unit.title}
Topic id: ${topic.id}
Topic title: ${topic.title}
Prompt family: ${selection.promptFamily}
Policy: ${getPromptPolicyText(selection.subject.id)}
Allowed learning outcomes for this topic:
${topic.outcomeIds.map((outcomeId, index) => `- ${outcomeId}: ${topic.outcomeTexts[index] ?? ""}`).join("\n")}

Important curriculum rules:
- Create content for the selected topic only.
- Do not reference outcomes outside this topic.
- Keep the lesson classroom-ready, editable, and aligned to the allowed outcomes only.`
}

export function validateGeneratedOutlineBatchAgainstCurriculumSelection(
    batch: LessonOutlineBatchDraft,
    selection: ResolvedAILessonCurriculumSelection
): CurriculumAlignmentIssue[] {
    if (!batch.lessons.length) {
        return [{ code: "OUTLINE_EMPTY", message: "Generated outline batch is empty." }]
    }

    const issues: CurriculumAlignmentIssue[] = []
    const allowedTopicIds = new Set(selection.selectedTopics.map((topic) => topic.id))

    if (selection.template && batch.lessons.length !== 1) {
        issues.push({
            code: "OUTLINE_LESSON_COUNT",
            message: "Template-bound outline generation must return exactly one lesson.",
        })
    }

    batch.lessons.forEach((lesson) => {
        lesson.topics.forEach((topic) => {
            if (!allowedTopicIds.has(topic.id)) {
                issues.push({
                    code: "OUTLINE_TOPIC_NOT_ALLOWED",
                    message: "Generated outline contains a topic outside the allowed curriculum selection.",
                    topicId: topic.id,
                })
            }
        })
    })

    return issues
}

export function alignGeneratedOutlineBatchToCurriculumSelection(
    batch: LessonOutlineBatchDraft,
    selection: ResolvedAILessonCurriculumSelection
): LessonOutlineBatchDraft {
    const topicMap = new Map(selection.selectedTopics.map((topic) => [topic.id, topic]))
    const firstLesson = batch.lessons[0]
    const title = selection.template?.title ?? firstLesson?.title ?? selection.unit.title
    const description = selection.template?.description ?? firstLesson?.description ?? `บทเรียนจากหน่วย ${selection.unit.title}`

    const topics = (selection.template
        ? selection.template.topicStructure
              .map((templateTopic, index) => {
                  const topicId = templateTopic.topicIds[0]
                  const canonical = topicMap.get(topicId)
                  if (!canonical) return null
                  return {
                      id: canonical.id,
                      title: canonical.title,
                      description: canonical.notes?.[0] ?? canonical.outcomeTexts[0] ?? undefined,
                      order: index,
                  }
              })
              .filter(Boolean)
        : firstLesson.topics
              .filter((topic) => topicMap.has(topic.id))
              .map((topic, index) => {
                  const canonical = topicMap.get(topic.id)!
                  return {
                      id: canonical.id,
                      title: canonical.title,
                      description: canonical.notes?.[0] ?? topic.description ?? canonical.outcomeTexts[0] ?? undefined,
                      order: index,
                  }
              })) as LessonOutlineDraft["topics"]

    return {
        lessons: [
            {
                title,
                description,
                subject: selection.subject.displayNameTh,
                gradeLevel: selection.unit.gradeLevels[0],
                topics,
            },
        ],
    }
}

export function validateTopicContentAgainstCurriculumSelection(
    topicContent: LessonTopicContentDraft,
    selection: ResolvedAILessonCurriculumSelection
): CurriculumAlignmentIssue[] {
    const allowedTopicIds = new Set(selection.selectedTopics.map((topic) => topic.id))
    if (!allowedTopicIds.has(topicContent.topicId)) {
        return [
            {
                code: "TOPIC_CONTENT_TOPIC_MISMATCH",
                message: "Generated topic content does not belong to the selected curriculum topic.",
                topicId: topicContent.topicId,
            },
        ]
    }

    return []
}

export function getAvailableTemplateIdsForSubject(subjectId: CanonicalCoreSubjectId) {
    return getSubjectLessonTemplatePack(subjectId)?.templates.map((template) => template.id) ?? []
}
