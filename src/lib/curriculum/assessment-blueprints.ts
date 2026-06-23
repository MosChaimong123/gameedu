import { z } from "zod"
import {
    CANONICAL_SUBJECT_CATALOG,
    canonicalSubjectIdSchema,
    findCanonicalSubjectByLabel,
    getCanonicalSubjectById,
    type CanonicalSubjectCatalogEntry,
    type CanonicalSubjectId,
} from "@/lib/curriculum/subject-catalog"
import { assessmentSourceTypeSchema, type CourseAssessmentSource } from "@/lib/courses/assessment-source"

export const subjectAssessmentFamilySchema = z.enum([
    "language_literacy",
    "mathematical_reasoning",
    "science_inquiry",
    "civic_humanities",
    "wellbeing_application",
    "creative_reflection",
    "career_practice",
])

export const subjectAssessmentQuestionStyleSchema = z.enum([
    "fact_recall",
    "conceptual_understanding",
    "text_interpretation",
    "numerical_reasoning",
    "scenario_application",
    "evidence_analysis",
    "procedure_sequence",
    "reflection_judgement",
])

export const subjectAssessmentDifficultyWeightSchema = z.object({
    easy: z.number().min(0).max(1),
    medium: z.number().min(0).max(1),
    hard: z.number().min(0).max(1),
})

export const subjectAssessmentSourceBlueprintSchema = z.object({
    sourceType: assessmentSourceTypeSchema,
    minQuestionCount: z.number().int().min(3).max(20),
    defaultQuestionCount: z.number().int().min(3).max(20),
    maxQuestionCount: z.number().int().min(3).max(20),
    recommendedPassRatio: z.number().min(0.4).max(1),
    minimumOutcomeCoverage: z.number().int().min(1).max(10),
    preferredQuestionStyles: z.array(subjectAssessmentQuestionStyleSchema).min(1),
    promptNotes: z.array(z.string().trim().min(1)).min(1),
})

export const subjectAssessmentBlueprintSchema = z.object({
    id: z.string().trim().min(1),
    schemaVersion: z.literal("subject_assessment_blueprint_v1"),
    subjectId: canonicalSubjectIdSchema,
    displayNameTh: z.string().trim().min(1),
    displayNameEn: z.string().trim().min(1),
    assessmentFamily: subjectAssessmentFamilySchema,
    supportedSourceTypes: z.array(assessmentSourceTypeSchema).min(1),
    difficultyWeights: subjectAssessmentDifficultyWeightSchema,
    globalPromptNotes: z.array(z.string().trim().min(1)).min(1),
    sourceBlueprints: z.array(subjectAssessmentSourceBlueprintSchema).min(1),
})

export const subjectAssessmentBlueprintCatalogSchema = z.array(subjectAssessmentBlueprintSchema).min(1)

export type SubjectAssessmentFamily = z.infer<typeof subjectAssessmentFamilySchema>
export type SubjectAssessmentQuestionStyle = z.infer<typeof subjectAssessmentQuestionStyleSchema>
export type SubjectAssessmentSourceBlueprint = z.infer<typeof subjectAssessmentSourceBlueprintSchema>
export type SubjectAssessmentBlueprint = z.infer<typeof subjectAssessmentBlueprintSchema>
export type SubjectAssessmentBlueprintCatalog = z.infer<typeof subjectAssessmentBlueprintCatalogSchema>

function createSourceBlueprint(
    sourceType: z.infer<typeof assessmentSourceTypeSchema>,
    config: Omit<SubjectAssessmentSourceBlueprint, "sourceType">
): SubjectAssessmentSourceBlueprint {
    return { sourceType, ...config }
}

function createBlueprint(
    subjectId: CanonicalSubjectId,
    assessmentFamily: SubjectAssessmentFamily,
    globalPromptNotes: string[],
    sourceBlueprints: SubjectAssessmentSourceBlueprint[],
    difficultyWeights: SubjectAssessmentBlueprint["difficultyWeights"] = { easy: 0.3, medium: 0.5, hard: 0.2 }
): SubjectAssessmentBlueprint {
    const subject = getCanonicalSubjectById(subjectId)
    if (!subject) {
        throw new Error(`Unknown canonical subject id: ${subjectId}`)
    }

    return {
        id: `${subjectId}-assessment-blueprint-v1`,
        schemaVersion: "subject_assessment_blueprint_v1",
        subjectId,
        displayNameTh: subject.displayNameTh,
        displayNameEn: subject.displayNameEn,
        assessmentFamily,
        supportedSourceTypes: sourceBlueprints.map((entry) => entry.sourceType),
        difficultyWeights,
        globalPromptNotes,
        sourceBlueprints,
    }
}

const languageTopicBlueprint = createSourceBlueprint("topic", {
    minQuestionCount: 5,
    defaultQuestionCount: 8,
    maxQuestionCount: 12,
    recommendedPassRatio: 0.6,
    minimumOutcomeCoverage: 1,
    preferredQuestionStyles: ["text_interpretation", "conceptual_understanding", "reflection_judgement"],
    promptNotes: [
        "Use the exact lesson wording as the anchor for comprehension and interpretation questions.",
        "Prefer distractors that test reading precision instead of random trivia.",
    ],
})

const languageLessonBlueprint = createSourceBlueprint("lesson", {
    minQuestionCount: 6,
    defaultQuestionCount: 10,
    maxQuestionCount: 14,
    recommendedPassRatio: 0.6,
    minimumOutcomeCoverage: 2,
    preferredQuestionStyles: ["text_interpretation", "conceptual_understanding", "reflection_judgement"],
    promptNotes: [
        "Distribute questions across all lesson topics.",
        "Avoid repeating the same sentence pattern across all questions.",
    ],
})

const languageModuleBlueprint = createSourceBlueprint("module", {
    minQuestionCount: 8,
    defaultQuestionCount: 12,
    maxQuestionCount: 16,
    recommendedPassRatio: 0.65,
    minimumOutcomeCoverage: 3,
    preferredQuestionStyles: ["text_interpretation", "conceptual_understanding", "reflection_judgement"],
    promptNotes: [
        "Blend comprehension, synthesis, and application across the module.",
        "Ensure questions require comparing ideas from more than one lesson when the source allows it.",
    ],
})

const stemTopicBlueprint = createSourceBlueprint("topic", {
    minQuestionCount: 5,
    defaultQuestionCount: 8,
    maxQuestionCount: 12,
    recommendedPassRatio: 0.7,
    minimumOutcomeCoverage: 1,
    preferredQuestionStyles: ["conceptual_understanding", "numerical_reasoning", "scenario_application"],
    promptNotes: [
        "Prioritize observable cause-effect reasoning and step-by-step thinking.",
        "Use numbers only when the source lesson explicitly supports them.",
    ],
})

const stemLessonBlueprint = createSourceBlueprint("lesson", {
    minQuestionCount: 6,
    defaultQuestionCount: 10,
    maxQuestionCount: 14,
    recommendedPassRatio: 0.7,
    minimumOutcomeCoverage: 2,
    preferredQuestionStyles: ["conceptual_understanding", "numerical_reasoning", "scenario_application"],
    promptNotes: [
        "Cover each major learning objective at least once before deepening difficulty.",
        "Include at least one application-style item when the source contains processes or examples.",
    ],
})

const stemModuleBlueprint = createSourceBlueprint("module", {
    minQuestionCount: 8,
    defaultQuestionCount: 12,
    maxQuestionCount: 18,
    recommendedPassRatio: 0.7,
    minimumOutcomeCoverage: 3,
    preferredQuestionStyles: ["conceptual_understanding", "numerical_reasoning", "scenario_application", "evidence_analysis"],
    promptNotes: [
        "Balance concept checks with reasoning and multi-step application.",
        "Avoid requiring formulas or concepts not present in the module source.",
    ],
})

const humanitiesTopicBlueprint = createSourceBlueprint("topic", {
    minQuestionCount: 5,
    defaultQuestionCount: 8,
    maxQuestionCount: 12,
    recommendedPassRatio: 0.65,
    minimumOutcomeCoverage: 1,
    preferredQuestionStyles: ["conceptual_understanding", "evidence_analysis", "reflection_judgement"],
    promptNotes: [
        "Tie every question back to evidence or claims inside the lesson.",
        "Use distractors that reflect common misunderstandings in interpretation.",
    ],
})

const humanitiesLessonBlueprint = createSourceBlueprint("lesson", {
    minQuestionCount: 6,
    defaultQuestionCount: 10,
    maxQuestionCount: 14,
    recommendedPassRatio: 0.65,
    minimumOutcomeCoverage: 2,
    preferredQuestionStyles: ["conceptual_understanding", "evidence_analysis", "reflection_judgement"],
    promptNotes: [
        "Check both recall of key ideas and interpretation of examples or contexts.",
        "Prefer evidence-based questions over opinion-only prompts.",
    ],
})

const humanitiesModuleBlueprint = createSourceBlueprint("module", {
    minQuestionCount: 8,
    defaultQuestionCount: 12,
    maxQuestionCount: 16,
    recommendedPassRatio: 0.65,
    minimumOutcomeCoverage: 3,
    preferredQuestionStyles: ["conceptual_understanding", "evidence_analysis", "reflection_judgement"],
    promptNotes: [
        "Mix topic-specific questions with cross-lesson synthesis.",
        "Require students to distinguish evidence, viewpoint, and conclusion where relevant.",
    ],
})

const practiceTopicBlueprint = createSourceBlueprint("topic", {
    minQuestionCount: 5,
    defaultQuestionCount: 8,
    maxQuestionCount: 12,
    recommendedPassRatio: 0.7,
    minimumOutcomeCoverage: 1,
    preferredQuestionStyles: ["scenario_application", "procedure_sequence", "conceptual_understanding"],
    promptNotes: [
        "Favor practical decision-making and safety-aware choices.",
        "Questions should reflect what a student would do, not just define terms.",
    ],
})

const practiceLessonBlueprint = createSourceBlueprint("lesson", {
    minQuestionCount: 6,
    defaultQuestionCount: 10,
    maxQuestionCount: 14,
    recommendedPassRatio: 0.7,
    minimumOutcomeCoverage: 2,
    preferredQuestionStyles: ["scenario_application", "procedure_sequence", "conceptual_understanding"],
    promptNotes: [
        "Blend procedural and concept questions so students must apply knowledge.",
        "Use realistic classroom or daily-life situations where the source allows it.",
    ],
})

const practiceModuleBlueprint = createSourceBlueprint("module", {
    minQuestionCount: 8,
    defaultQuestionCount: 12,
    maxQuestionCount: 16,
    recommendedPassRatio: 0.75,
    minimumOutcomeCoverage: 3,
    preferredQuestionStyles: ["scenario_application", "procedure_sequence", "conceptual_understanding", "reflection_judgement"],
    promptNotes: [
        "Assess readiness to perform or explain a process from start to finish.",
        "Use cumulative situations that combine more than one topic when supported by the source.",
    ],
})

export const SUBJECT_ASSESSMENT_BLUEPRINTS: SubjectAssessmentBlueprintCatalog = [
    createBlueprint("thai", "language_literacy", [
        "Assess reading, language use, and interpretation from the provided lesson only.",
        "Keep wording accessible, precise, and aligned with Thai classroom usage.",
    ], [languageTopicBlueprint, languageLessonBlueprint, languageModuleBlueprint]),
    createBlueprint("mathematics", "mathematical_reasoning", [
        "Emphasize mathematical reasoning, representation, and correct interpretation of problem statements.",
        "When no calculation steps are in the source, stay conceptual rather than inventing formulas.",
    ], [stemTopicBlueprint, stemLessonBlueprint, stemModuleBlueprint]),
    createBlueprint("science_technology", "science_inquiry", [
        "Assess observable evidence, scientific explanation, and technology-related reasoning from the source only.",
        "Prefer clear phenomenon-to-explanation logic over trivia recall.",
    ], [stemTopicBlueprint, stemLessonBlueprint, stemModuleBlueprint]),
    createBlueprint("social_religion_culture", "civic_humanities", [
        "Assess interpretation of ideas, contexts, and evidence with respectful neutral wording.",
        "Avoid questions that reward memorizing dates or names not present in the source.",
    ], [humanitiesTopicBlueprint, humanitiesLessonBlueprint, humanitiesModuleBlueprint]),
    createBlueprint("health_physical_education", "wellbeing_application", [
        "Assess health decisions, movement understanding, and safe practice from the source only.",
        "Prefer scenario-based choices that reflect responsible action.",
    ], [practiceTopicBlueprint, practiceLessonBlueprint, practiceModuleBlueprint]),
    createBlueprint("arts", "creative_reflection", [
        "Assess observation, interpretation, and reflective judgement grounded in the lesson content.",
        "Avoid turning arts assessment into pure memorization unless the source explicitly teaches terms.",
    ], [humanitiesTopicBlueprint, humanitiesLessonBlueprint, humanitiesModuleBlueprint]),
    createBlueprint("career", "career_practice", [
        "Assess task readiness, procedures, and applied work habits from the source only.",
        "Use practical workplace or life-task framing when appropriate.",
    ], [practiceTopicBlueprint, practiceLessonBlueprint, practiceModuleBlueprint]),
    createBlueprint("foreign_languages", "language_literacy", [
        "Assess comprehension and language usage from the lesson without adding outside grammar rules.",
        "Keep distractors close enough to test understanding, not random guessing.",
    ], [languageTopicBlueprint, languageLessonBlueprint, languageModuleBlueprint]),
    createBlueprint("physics", "science_inquiry", [
        "Assess physical reasoning from evidence, relationships, and classroom examples in the source.",
        "Prefer questions that connect quantity, phenomenon, and explanation over formula-only recall.",
    ], [
        stemTopicBlueprint,
        { ...stemLessonBlueprint, recommendedPassRatio: 0.75, promptNotes: [...stemLessonBlueprint.promptNotes, "For physics lessons, emphasize links between variables, force, motion, energy, or field behaviour where present."] },
        { ...stemModuleBlueprint, recommendedPassRatio: 0.75, promptNotes: [...stemModuleBlueprint.promptNotes, "For physics modules, include at least one question that asks students to explain a phenomenon using the lesson concepts."] },
    ], { easy: 0.25, medium: 0.45, hard: 0.3 }),
    createBlueprint("chemistry", "science_inquiry", [
        "Assess particle-level reasoning, properties of matter, and process understanding from the source only.",
        "Use equations or symbols only when they already appear in the lesson content.",
    ], [stemTopicBlueprint, stemLessonBlueprint, stemModuleBlueprint], { easy: 0.25, medium: 0.5, hard: 0.25 }),
    createBlueprint("biology", "science_inquiry", [
        "Assess structure-function relationships, systems thinking, and evidence from the lesson only.",
        "Favor applied understanding of life processes over isolated fact memorization.",
    ], [stemTopicBlueprint, stemLessonBlueprint, stemModuleBlueprint]),
    createBlueprint("earth_space_science", "science_inquiry", [
        "Assess interpretation of systems, cycles, and phenomena from the source only.",
        "Use observation, model interpretation, and evidence-focused wording when available.",
    ], [stemTopicBlueprint, stemLessonBlueprint, stemModuleBlueprint]),
]

export function validateSubjectAssessmentBlueprintCatalog(value: unknown) {
    const parsed = subjectAssessmentBlueprintCatalogSchema.safeParse(value)
    if (!parsed.success) return parsed

    const issues: z.ZodIssue[] = []
    const ids = new Set<string>()
    const subjectIds = new Set<CanonicalSubjectId>()
    const allowedSubjectIds = new Set(CANONICAL_SUBJECT_CATALOG.map((entry) => entry.id))

    parsed.data.forEach((blueprint, index) => {
        if (ids.has(blueprint.id)) {
            issues.push({ code: z.ZodIssueCode.custom, message: "Blueprint ids must be unique.", path: [index, "id"] })
        }
        ids.add(blueprint.id)

        if (subjectIds.has(blueprint.subjectId)) {
            issues.push({ code: z.ZodIssueCode.custom, message: "Each subject can only have one assessment blueprint.", path: [index, "subjectId"] })
        }
        subjectIds.add(blueprint.subjectId)

        blueprint.sourceBlueprints.forEach((sourceBlueprint, sourceIndex) => {
            if (sourceBlueprint.minQuestionCount > sourceBlueprint.defaultQuestionCount) {
                issues.push({
                    code: z.ZodIssueCode.custom,
                    message: "defaultQuestionCount must be greater than or equal to minQuestionCount.",
                    path: [index, "sourceBlueprints", sourceIndex, "defaultQuestionCount"],
                })
            }
            if (sourceBlueprint.defaultQuestionCount > sourceBlueprint.maxQuestionCount) {
                issues.push({
                    code: z.ZodIssueCode.custom,
                    message: "defaultQuestionCount must be less than or equal to maxQuestionCount.",
                    path: [index, "sourceBlueprints", sourceIndex, "defaultQuestionCount"],
                })
            }
        })
    })

    allowedSubjectIds.forEach((subjectId) => {
        if (!subjectIds.has(subjectId)) {
            issues.push({ code: z.ZodIssueCode.custom, message: `Missing assessment blueprint for subject ${subjectId}.`, path: [] })
        }
    })

    return issues.length === 0
        ? { success: true as const, data: parsed.data }
        : { success: false as const, error: new z.ZodError(issues) }
}

export function getSubjectAssessmentBlueprint(subjectId: CanonicalSubjectId) {
    return SUBJECT_ASSESSMENT_BLUEPRINTS.find((entry) => entry.subjectId === subjectId) ?? null
}

export function resolveSubjectAssessmentBlueprintFromLabel(subjectLabel: string | null | undefined): {
    subject: CanonicalSubjectCatalogEntry
    blueprint: SubjectAssessmentBlueprint
} | null {
    if (!subjectLabel) return null
    const subject = findCanonicalSubjectByLabel(subjectLabel)
    if (!subject) return null
    const blueprint = getSubjectAssessmentBlueprint(subject.id)
    if (!blueprint) return null
    return { subject, blueprint }
}

export function getSubjectAssessmentSourceBlueprint(
    blueprint: SubjectAssessmentBlueprint,
    sourceType: CourseAssessmentSource["sourceType"]
) {
    return blueprint.sourceBlueprints.find((entry) => entry.sourceType === sourceType) ?? null
}

export function resolveAssessmentQuestionCount(input: {
    requestedCount?: number | null
    blueprint: SubjectAssessmentBlueprint | null
    sourceType: CourseAssessmentSource["sourceType"]
}) {
    const sourceBlueprint = input.blueprint ? getSubjectAssessmentSourceBlueprint(input.blueprint, input.sourceType) : null
    const minimum = sourceBlueprint?.minQuestionCount ?? 3
    const maximum = sourceBlueprint?.maxQuestionCount ?? 20
    const fallback = sourceBlueprint?.defaultQuestionCount ?? 10
    const raw = input.requestedCount

    if (!Number.isFinite(raw)) return fallback
    return Math.min(Math.max(Math.trunc(raw as number), minimum), maximum)
}

export function getRecommendedAssessmentPassScore(input: {
    questionCount: number
    blueprint: SubjectAssessmentBlueprint | null
    sourceType: CourseAssessmentSource["sourceType"]
}) {
    const sourceBlueprint = input.blueprint ? getSubjectAssessmentSourceBlueprint(input.blueprint, input.sourceType) : null
    if (!sourceBlueprint) return null
    return Math.max(1, Math.ceil(input.questionCount * sourceBlueprint.recommendedPassRatio))
}

export function buildSubjectAssessmentBlueprintPromptContext(input: {
    blueprint: SubjectAssessmentBlueprint
    sourceType: CourseAssessmentSource["sourceType"]
}) {
    const sourceBlueprint = getSubjectAssessmentSourceBlueprint(input.blueprint, input.sourceType)
    if (!sourceBlueprint) return null

    return `Subject assessment blueprint:
Subject id: ${input.blueprint.subjectId}
Subject name: ${input.blueprint.displayNameEn}
Assessment family: ${input.blueprint.assessmentFamily}
Allowed source type: ${sourceBlueprint.sourceType}
Recommended question count range: ${sourceBlueprint.minQuestionCount}-${sourceBlueprint.maxQuestionCount}
Recommended default question count: ${sourceBlueprint.defaultQuestionCount}
Recommended pass ratio: ${Math.round(sourceBlueprint.recommendedPassRatio * 100)}%
Minimum outcome coverage: ${sourceBlueprint.minimumOutcomeCoverage}
Preferred question styles: ${sourceBlueprint.preferredQuestionStyles.join(", ")}
Global blueprint notes:
${input.blueprint.globalPromptNotes.map((note) => `- ${note}`).join("\n")}
Source-specific notes:
${sourceBlueprint.promptNotes.map((note) => `- ${note}`).join("\n")}`
}
