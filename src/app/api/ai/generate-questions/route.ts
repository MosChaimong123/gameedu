import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextResponse } from "next/server"
import { auth } from "@/auth"

type GeminiContentPart =
    | { text: string }
    | {
        inlineData: {
            data: string
            mimeType: string
        }
    }

type GeneratedQuestion = {
    question: string
    options: string[]
    correctAnswer: number
    explanation?: string
}

// Initialize inside the handler for better environment variable reliability

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const { content, count = 10, language = "th", difficulty = "MEDIUM", pdfData } = await req.json()

        if (!content && !pdfData) {
            return new NextResponse("Content or PDF data is required", { status: 400 })
        }

        if (!process.env.GEMINI_API_KEY) {
            console.error("[AI_GENERATE] GEMINI_API_KEY is missing in .env")
            return new NextResponse("Gemini API Key missing in server environment", { status: 500 })
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

        // Using gemini-flash-latest (as discovered from ListModels list)
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
        })

        const prompt = `
            You are an expert educational content creator for GameEdu.
            Generate ${count} high-quality multiple choice questions based on the provided content.
            Target Difficulty Level: ${difficulty === "EASY" ? "Easy/Basic (Recall of facts)" : difficulty === "HARD" ? "Hard/Professional (Application and Critical Thinking)" : "Normal (Understanding and Analysis)"}
            The response language should be ${language === "th" ? "Thai" : "English"}.
            Return ONLY a valid JSON array of objects.
            Each object must have: "question" (string), "options" (array of 4 strings), "correctAnswer" (number 0-3), "explanation" (string).
        `

        // Build parts for generation (Restoring PDF support)
        const parts: GeminiContentPart[] = []
        
        if (pdfData) {
            parts.push({
                inlineData: {
                    data: pdfData,
                    mimeType: "application/pdf"
                }
            })
        }

        if (content && content.trim().length > 0) {
            parts.push({ text: `CONTENT:\n${content}` })
        }
        
        // Add prompt last
        parts.push({ text: prompt })

        // Request JSON output
        const result = await model.generateContent(parts)
        const response = result.response
        
        let text = response.text()
        
        // Clean markdown formatting if present
        if (text.includes("```")) {
            text = text.replace(/```json/g, "").replace(/```/g, "").trim()
        }
        
        // Parse and add IDs and default values to match GameEdu format
        const questions = (JSON.parse(text) as GeneratedQuestion[]).map((q) => ({
            id: crypto.randomUUID(),
            question: q.question,
            image: null,
            timeLimit: 20,
            options: q.options,
            optionTypes: ["TEXT", "TEXT", "TEXT", "TEXT"],
            questionType: "MULTIPLE_CHOICE",
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || "",
        }))

        return NextResponse.json(questions)
    } catch (error) {
        console.error("[AI_GENERATE_POST]", error)
        return new NextResponse("Internal Error during AI generation", { status: 500 })
    }
}
