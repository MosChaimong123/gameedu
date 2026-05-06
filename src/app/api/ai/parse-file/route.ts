import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createAppErrorResponse, AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE } from "@/lib/api-error";
import {
    buildRateLimitKey,
    consumeRateLimitWithStore,
    createRateLimitResponse,
    getRequestClientIdentifier,
} from "@/lib/security/rate-limit"
import { getLimitsForUser } from "@/lib/plan/plan-access"

// Cache buster: v2-force-resync-v5-revert-to-stable-pdfparse

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        if (session.user.role === "STUDENT") return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)

        const planLimits = getLimitsForUser(
            session.user.role,
            session.user.plan,
            session.user.planStatus,
            session.user.planExpiry
        )
        if (!planLimits.aiFileParse) {
            return createAppErrorResponse(
                "PLAN_LIMIT_AI_FEATURE",
                "AI file parsing is not included in your plan",
                403
            )
        }

        const rateLimit = await consumeRateLimitWithStore({
            bucket: "ai-parse-file:post",
            key: buildRateLimitKey(getRequestClientIdentifier(req), session.user.id),
            limit: 10,
            windowMs: 60_000,
        })

        if (!rateLimit.allowed) {
            return createRateLimitResponse(rateLimit.retryAfterSeconds)
        }

        const formData = await req.formData()
        const file = formData.get("file") as File
        if (!file) return createAppErrorResponse("NO_FILE", "No file uploaded", 400)

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const normalizedFileName = file.name.trim().toLowerCase()
        const isPDF = file.type === "application/pdf" || normalizedFileName.endsWith(".pdf")
        let pdfData = ""
        let text = ""

        if (isPDF) {
            pdfData = buffer.toString("base64")
            // Use eval('require') to bypass Next.js/Turbopack's attempts to "smartly" analyze the package
            // which often fails for pdf-parse due to its internal structure and test files.
            const pdf = eval('require')("pdf-parse") as (input: Buffer) => Promise<{ text: string }>
            const data = await pdf(buffer)
            text = data.text
        } else {
            text = buffer.toString("utf-8")
        }

        // If it's a PDF, we don't care if text is short because we have the raw data for Gemini
        if (!isPDF && (!text || text.trim().length < 5)) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Could not extract enough text from file. Please make sure the file contains readable text.", 400)
        }

        return NextResponse.json({ 
            text, 
            pdfData: isPDF ? pdfData : null,
            fileName: file.name
        })
    } catch (error: unknown) {
        console.error("[FILE_PARSE_POST]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Internal Error during file parsing", 500)
    }
}
