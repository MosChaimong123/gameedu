import { GoogleGenerativeAI } from "@google/generative-ai"

export type GeminiContentPart =
    | { text: string }
    | { inlineData: { data: string; mimeType: string } }

const DEFAULT_GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash-lite",
    "gemini-flash-lite-latest",
]

export function stripJsonFence(raw: string) {
    return raw.includes("```") ? raw.replace(/```json/g, "").replace(/```/g, "").trim() : raw.trim()
}

export async function generateGeminiTextWithFallback(
    parts: GeminiContentPart[],
    options: {
        apiKey: string
        models?: string[]
    }
): Promise<
    | { ok: true; raw: string }
    | { ok: false; reason: "rate_limited"; lastError: unknown }
    | { ok: false; reason: "failed"; lastError: unknown }
> {
    const genAI = new GoogleGenerativeAI(options.apiKey)
    const models = options.models ?? DEFAULT_GEMINI_MODELS

    let lastError: unknown
    let rateLimited = false
    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName })
            const result = await model.generateContent(parts)
            return { ok: true, raw: result.response.text() }
        } catch (error) {
            lastError = error
            const message = error instanceof Error ? error.message : ""
            const is503 =
                message.includes("503") ||
                message.includes("overloaded") ||
                message.includes("Service Unavailable")
            const is429 = message.includes("429") || message.includes("Too Many Requests")
            const is404 = message.includes("404") || message.includes("not found")
            const isHardQuota = message.includes("limit: 0") || message.includes("limit\": 0")
            if (is429) rateLimited = true
            if (is404 || isHardQuota || is503 || is429) continue
            throw error
        }
    }

    return rateLimited
        ? { ok: false, reason: "rate_limited", lastError }
        : { ok: false, reason: "failed", lastError }
}
