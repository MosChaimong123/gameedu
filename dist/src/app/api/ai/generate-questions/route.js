"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const generative_ai_1 = require("@google/generative-ai");
const server_1 = require("next/server");
const auth_1 = require("@/auth");
// Initialize inside the handler for better environment variable reliability
// Define the response schema for structural output
const schema = {
    description: "List of multiple choice questions",
    type: generative_ai_1.SchemaType.ARRAY,
    items: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            question: {
                type: generative_ai_1.SchemaType.STRING,
                description: "The question text",
                nullable: false,
            },
            options: {
                type: generative_ai_1.SchemaType.ARRAY,
                items: { type: generative_ai_1.SchemaType.STRING },
                description: "Four multiple choice options",
                minItems: 4,
                maxItems: 4,
            },
            correctAnswer: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: "Index of the correct answer (0-3)",
                nullable: false,
            },
            explanation: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Brief explanation of why the answer is correct",
            },
        },
        required: ["question", "options", "correctAnswer"],
    },
};
async function POST(req) {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const { content, count = 10, language = "th", difficulty = "MEDIUM", pdfData, fileName } = await req.json();
        if (!content && !pdfData) {
            return new server_1.NextResponse("Content or PDF data is required", { status: 400 });
        }
        if (!process.env.GEMINI_API_KEY) {
            console.error("[AI_GENERATE] GEMINI_API_KEY is missing in .env");
            return new server_1.NextResponse("Gemini API Key missing in server environment", { status: 500 });
        }
        const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Using gemini-flash-latest (as discovered from ListModels list)
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
        });
        const prompt = `
            You are an expert educational content creator for GameEdu.
            Generate ${count} high-quality multiple choice questions based on the provided content.
            Target Difficulty Level: ${difficulty === "EASY" ? "Easy/Basic (Recall of facts)" : difficulty === "HARD" ? "Hard/Professional (Application and Critical Thinking)" : "Normal (Understanding and Analysis)"}
            The response language should be ${language === "th" ? "Thai" : "English"}.
            Return ONLY a valid JSON array of objects.
            Each object must have: "question" (string), "options" (array of 4 strings), "correctAnswer" (number 0-3), "explanation" (string).
        `;
        // Build parts for generation (Restoring PDF support)
        const parts = [];
        if (pdfData) {
            parts.push({
                inlineData: {
                    data: pdfData,
                    mimeType: "application/pdf"
                }
            });
        }
        if (content && content.trim().length > 0) {
            parts.push({ text: `CONTENT:\n${content}` });
        }
        // Add prompt last
        parts.push({ text: prompt });
        // Request JSON output
        const result = await model.generateContent(parts);
        const response = result.response;
        let text = response.text();
        // Clean markdown formatting if present
        if (text.includes("```")) {
            text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        }
        // Parse and add IDs and default values to match GameEdu format
        const questions = JSON.parse(text).map((q) => ({
            id: crypto.randomUUID(),
            question: q.question,
            image: null,
            timeLimit: 20,
            options: q.options,
            optionTypes: ["TEXT", "TEXT", "TEXT", "TEXT"],
            questionType: "MULTIPLE_CHOICE",
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || "",
        }));
        return server_1.NextResponse.json(questions);
    }
    catch (error) {
        console.error("[AI_GENERATE_POST]", error);
        return new server_1.NextResponse("Internal Error during AI generation", { status: 500 });
    }
}
