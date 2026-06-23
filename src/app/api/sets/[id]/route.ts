import { auth } from "@/auth"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { countQuestionsInJson, getLimitsForUser } from "@/lib/plan/plan-access";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import {
    validateQuestionSetQuestions,
    type QuestionSetQuestion,
} from "@/lib/question-set-schema";
import { validateQuestionSetSourceMetadata } from "@/lib/courses/assessment-source";

type UpdateSetRequest = {
    title?: string
    description?: string | null
    questions?: Prisma.InputJsonValue
    isPublic?: boolean
    coverImage?: string | null
    folderId?: string | null
    sourceMetadata?: unknown | null
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session || !session.user) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        }

        if (!isTeacherOrAdmin(session.user.role)) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        // Await params as per Next.js 15/16 changes if necessary, 
        // though usually params is accessible directly in older versions.
        // In Next.js 15+ params is a Promise.
        const { id } = await params

        const set = await db.questionSet.findUnique({
            where: {
                id: id,
                creatorId: session.user.id,
            },
        })

        if (!set) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404)
        }

        return NextResponse.json(set)
    } catch (error) {
        console.error("[SET_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500)
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session || !session.user) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        }

        if (!isTeacherOrAdmin(session.user.role)) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        const { id } = await params
        const body = await req.json() as UpdateSetRequest
        const { title, description, questions, isPublic, coverImage, folderId, sourceMetadata } = body

        // Check ownership
        const existingSet = await db.questionSet.findUnique({
            where: {
                id: id,
                creatorId: session.user.id,
            },
        })

        if (!existingSet) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404)
        }

        const limits = getLimitsForUser(
            session.user.role,
            session.user.plan,
            session.user.planStatus,
            session.user.planExpiry
        )
        let validatedQuestionsPayload: QuestionSetQuestion[] | undefined
        let validatedSourceMetadataPayload: Prisma.InputJsonValue | null | undefined
        if (questions !== undefined) {
            const validatedQuestions = validateQuestionSetQuestions(questions)
            if (!validatedQuestions.ok) {
                return createAppErrorResponse("INVALID_PAYLOAD", "Invalid question data", 400)
            }
            validatedQuestionsPayload = validatedQuestions.questions
        }
        if (sourceMetadata !== undefined) {
            if (sourceMetadata === null) {
                validatedSourceMetadataPayload = null
            } else {
                const validatedSourceMetadata = validateQuestionSetSourceMetadata(sourceMetadata)
                if (!validatedSourceMetadata.ok) {
                    return createAppErrorResponse("INVALID_PAYLOAD", "Invalid assessment source metadata", 400)
                }
                validatedSourceMetadataPayload = validatedSourceMetadata.sourceMetadata as unknown as Prisma.InputJsonValue
            }
        }
        const nextQuestionCount =
            validatedQuestionsPayload !== undefined
                ? countQuestionsInJson(validatedQuestionsPayload)
                : countQuestionsInJson(existingSet.questions)
        if (Number.isFinite(limits.maxQuestionsPerSet) && nextQuestionCount > limits.maxQuestionsPerSet) {
            return createAppErrorResponse(
                "PLAN_LIMIT_QUESTIONS_PER_SET",
                "Too many questions in this set for your plan",
                403
            )
        }

        if (folderId) {
            const targetFolder = await db.folder.findFirst({
                where: {
                    id: folderId,
                    creatorId: session.user.id,
                },
                select: {
                    id: true,
                },
            })

            if (!targetFolder) {
                return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404)
            }
        }

        const updateData: Prisma.QuestionSetUncheckedUpdateInput = {
            title,
            description,
            ...(validatedQuestionsPayload !== undefined
                ? { questions: validatedQuestionsPayload as unknown as Prisma.InputJsonValue }
                : {}),
            isPublic,
            coverImage,
            folderId,
            ...(validatedSourceMetadataPayload !== undefined ? { sourceMetadata: validatedSourceMetadataPayload } : {}),
        }

        const updatedSet = await db.questionSet.update({
            where: {
                id: id,
            },
            data: updateData,
        })

        return NextResponse.json(updatedSet)
    } catch (error) {
        console.error("[SET_PATCH]", error)
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500)
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session || !session.user) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        }

        if (!isTeacherOrAdmin(session.user.role)) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        const { id } = await params

        // Check ownership
        const existingSet = await db.questionSet.findUnique({
            where: {
                id: id,
                creatorId: session.user.id,
            },
        })

        if (!existingSet) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404)
        }

        await db.questionSet.delete({
            where: {
                id: id,
            },
        })

        return new NextResponse(null, { status: 200 })
    } catch (error) {
        console.error("[SET_DELETE]", error)
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500)
    }
}
