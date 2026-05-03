import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { getLimitsForUser } from "@/lib/plan/plan-access";
import { isTeacherOrAdmin } from "@/lib/role-guards";

export async function GET() {
    try {
        const session = await auth()

        if (!session || !session.user) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        }

        if (!isTeacherOrAdmin(session.user.role)) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        // Fetch sets created by the current user
        const sets = await db.questionSet.findMany({
            where: {
                creatorId: session.user.id,
            },
            orderBy: {
                createdAt: "desc",
            },
        })

        return NextResponse.json(sets)
    } catch (error) {
        console.error("[SETS_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500)
    }
}

type CreateSetRequest = {
    title?: string
    description?: string
    isPublic?: boolean
    coverImage?: string | null
}

export async function POST(req: Request) {
    try {
        const session = await auth()

        if (!session || !session.user) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        }

        if (!isTeacherOrAdmin(session.user.role)) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        const body = await req.json() as CreateSetRequest
        const { title, description, isPublic, coverImage } = body

        if (!title) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Title is required", 400)
        }

        const limits = getLimitsForUser(session.user.role, session.user.plan)
        if (Number.isFinite(limits.maxQuestionSets)) {
            const existingCount = await db.questionSet.count({
                where: { creatorId: session.user.id as string },
            })
            if (existingCount >= limits.maxQuestionSets) {
                return createAppErrorResponse(
                    "PLAN_LIMIT_QUESTION_SETS",
                    "Question set limit reached for your plan",
                    403
                )
            }
        }

        const set = await db.questionSet.create({
            data: {
                title,
                description,
                isPublic: isPublic || false,
                coverImage,
                creatorId: session.user.id as string,
                questions: [], // Start empty
            },
        })

        return NextResponse.json(set)
    } catch (error: unknown) {
        console.error("[SETS_POST]", error)
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500)
    }
}
