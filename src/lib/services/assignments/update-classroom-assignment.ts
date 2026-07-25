import { db } from "@/lib/db"
import { syncTeachingMediaUsageForOwner } from "@/lib/actions/teaching-media-actions"
import { parseQuizReviewModeFromRequest } from "@/lib/quiz-review-policy"
import { normalizeQuizTimeLimitMinutes } from "@/lib/quiz-attempt"
import { getTeachingMediaUsageReferences, normalizeTeachingMediaReferences } from "@/lib/teaching-media-reference"
import { sumWorksheetMaxScore } from "@/lib/worksheet-assignment"
import { validateWorksheetData } from "@/lib/worksheet-schema"

type UpdateClassroomAssignmentArgs = {
    teacherId: string
    classroomId: string
    assignmentId: string
    body: Record<string, unknown>
}

type DeleteClassroomAssignmentArgs = {
    teacherId: string
    classroomId: string
    assignmentId: string
}

export type UpdateClassroomAssignmentResult =
    | { ok: false; reason: "classroom_forbidden" }
    | { ok: false; reason: "assignment_not_found" }
    | { ok: false; reason: "quiz_requires_question_set" }
    | { ok: false; reason: "invalid_worksheet" }
    | { ok: false; reason: "invalid_quiz_review_mode" }
    | { ok: false; reason: "question_set_not_found" }
    | { ok: true; assignment: unknown }

export type DeleteClassroomAssignmentResult =
    | { ok: false; reason: "classroom_forbidden" }
    | { ok: false; reason: "assignment_not_found" }
    | { ok: true }

type AssignmentPatchData = Parameters<typeof db.assignment.update>[0]["data"]

async function ensureTeacherOwnsClassroom(classroomId: string, teacherId: string) {
    const classroom = await db.classroom.findUnique({
        where: { id: classroomId, teacherId },
        select: { id: true },
    })
    return Boolean(classroom)
}

export async function updateClassroomAssignment(
    args: UpdateClassroomAssignmentArgs
): Promise<UpdateClassroomAssignmentResult> {
    if (!(await ensureTeacherOwnsClassroom(args.classroomId, args.teacherId))) {
        return { ok: false, reason: "classroom_forbidden" }
    }

    const existingAssignment = await db.assignment.findUnique({
        where: { id: args.assignmentId },
        select: { id: true, classId: true, type: true, quizSetId: true },
    })
    if (!existingAssignment || existingAssignment.classId !== args.classroomId) {
        return { ok: false, reason: "assignment_not_found" }
    }

    const body = args.body
    const explicitType = typeof body.type === "string" ? body.type : undefined

    if (explicitType === "quiz") {
        const incomingSet =
            typeof body.quizSetId === "string" && body.quizSetId.length > 0
                ? body.quizSetId
                : null
        if (!incomingSet && !existingAssignment.quizSetId) {
            return { ok: false, reason: "quiz_requires_question_set" }
        }
    }

    const effectiveType = explicitType ?? existingAssignment.type
    const data: AssignmentPatchData = {}

    if (typeof body.name === "string") data.name = body.name
    if (typeof body.maxScore === "number") data.maxScore = body.maxScore
    if (body.passScore !== undefined) {
        data.passScore =
            body.passScore === null || body.passScore === ""
                ? null
                : Number(body.passScore)
    }
    if (typeof body.type === "string") data.type = body.type
    if (body.checklists !== undefined) data.checklists = body.checklists as AssignmentPatchData["checklists"]
    if (typeof body.visible === "boolean") data.visible = body.visible
    if (typeof body.order === "number") data.order = body.order
    if (body.description !== undefined) {
        data.description =
            body.description === null || body.description === ""
                ? null
                : String(body.description)
    }
    if (body.mediaReferences !== undefined) {
        data.mediaReferences = normalizeTeachingMediaReferences(body.mediaReferences)
    }
    if (body.deadline !== undefined) {
        data.deadline =
            body.deadline === null || body.deadline === ""
                ? null
                : new Date(String(body.deadline))
    }

    if (
        explicitType === "score" ||
        explicitType === "checklist" ||
        explicitType === "standard"
    ) {
        data.quizSetId = null
        data.quizData = null
        data.quizReviewMode = null
        data.timeLimitMinutes = null
    }

    if (explicitType === "worksheet") {
        const parsedWorksheet = validateWorksheetData(body.worksheetData)
        if (!parsedWorksheet.ok) {
            return { ok: false, reason: "invalid_worksheet" }
        }
        data.quizSetId = null
        data.quizReviewMode = null
        data.timeLimitMinutes = null
        data.quizData = parsedWorksheet.data
        data.maxScore = sumWorksheetMaxScore(parsedWorksheet.data)
    }

    if (effectiveType === "quiz" && body.timeLimitMinutes !== undefined) {
        data.timeLimitMinutes = normalizeQuizTimeLimitMinutes(body.timeLimitMinutes)
    }

    if (effectiveType === "quiz" && body.quizReviewMode !== undefined) {
        const parsed = parseQuizReviewModeFromRequest(body.quizReviewMode)
        if (!parsed.ok) {
            return { ok: false, reason: "invalid_quiz_review_mode" }
        }
        if (parsed.value !== undefined) {
            data.quizReviewMode = parsed.value
        }
    }

    if (effectiveType === "quiz" && typeof body.quizSetId === "string" && body.quizSetId.length > 0) {
        const questionSet = await db.questionSet.findUnique({
            where: { id: body.quizSetId },
            select: { questions: true, creatorId: true },
        })
        if (!questionSet || questionSet.creatorId !== args.teacherId) {
            return { ok: false, reason: "question_set_not_found" }
        }
        data.quizSetId = body.quizSetId
        data.quizData = { questions: questionSet.questions }
    }

    if (Object.keys(data).length === 0) {
        const unchanged = await db.assignment.findUnique({
            where: { id: args.assignmentId },
        })
        return { ok: true, assignment: unchanged }
    }

    const assignment = await db.assignment.update({
        where: { id: args.assignmentId },
        data,
    })

    if (body.mediaReferences !== undefined) {
        const mediaReferences = normalizeTeachingMediaReferences(body.mediaReferences)
        await syncTeachingMediaUsageForOwner(
            args.teacherId,
            getTeachingMediaUsageReferences(mediaReferences)
        )
    }

    return { ok: true, assignment }
}

export async function deleteClassroomAssignment(
    args: DeleteClassroomAssignmentArgs
): Promise<DeleteClassroomAssignmentResult> {
    if (!(await ensureTeacherOwnsClassroom(args.classroomId, args.teacherId))) {
        return { ok: false, reason: "classroom_forbidden" }
    }

    const assignment = await db.assignment.findUnique({
        where: { id: args.assignmentId },
        select: { id: true, classId: true },
    })
    if (!assignment || assignment.classId !== args.classroomId) {
        return { ok: false, reason: "assignment_not_found" }
    }

    await db.assignment.delete({
        where: { id: args.assignmentId },
    })

    return { ok: true }
}
