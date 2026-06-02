import { GoogleGenerativeAI } from "@google/generative-ai";

export type LineAiPreliminaryGrade = {
    status: "graded";
    suggestedScore: number;
    maxScore: number;
    confidence: "low" | "medium" | "high";
    feedback: string;
};

export type LineAiPreliminaryGradeUnavailable = {
    status: "unavailable";
    reason: "missing_api_key" | "invalid_response" | "generation_failed" | "not_requested" | "plan_limit";
};

export type LineAiPreliminaryGradeResult = LineAiPreliminaryGrade | LineAiPreliminaryGradeUnavailable;

type GradeLineTextSubmissionInput = {
    assignmentName: string;
    assignmentDescription?: string | null;
    maxScore: number;
    studentAnswer: string;
};

function clampScore(value: unknown, maxScore: number): number {
    const numeric = typeof value === "number" && Number.isFinite(value) ? value : 0;
    return Math.max(0, Math.min(maxScore, Math.round(numeric)));
}

function normalizeConfidence(value: unknown): LineAiPreliminaryGrade["confidence"] {
    return value === "high" || value === "medium" || value === "low" ? value : "low";
}

export async function gradeLineTextSubmissionWithAi(
    input: GradeLineTextSubmissionInput
): Promise<LineAiPreliminaryGradeResult> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
        return { status: "unavailable", reason: "missing_api_key" };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const prompt = [
            "You are an assistant helping Thai teachers with preliminary grading.",
            "Grade only the submitted answer against the assignment prompt.",
            "This is not a final grade. The teacher will review it.",
            "Return ONLY valid JSON with keys: suggestedScore, confidence, feedback.",
            `Max score: ${input.maxScore}`,
            `Assignment: ${input.assignmentName}`,
            input.assignmentDescription ? `Assignment description: ${input.assignmentDescription}` : "",
            `Student answer:\n${input.studentAnswer}`,
            "Rules:",
            "- suggestedScore must be a number from 0 to max score.",
            "- confidence must be one of low, medium, high.",
            "- feedback must be concise Thai feedback for the teacher, not the student.",
        ]
            .filter(Boolean)
            .join("\n");

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        if (text.includes("```")) {
            text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        }

        const parsed = JSON.parse(text) as {
            suggestedScore?: unknown;
            confidence?: unknown;
            feedback?: unknown;
        };
        const feedback = typeof parsed.feedback === "string" ? parsed.feedback.trim() : "";
        if (!feedback) {
            return { status: "unavailable", reason: "invalid_response" };
        }

        return {
            status: "graded",
            suggestedScore: clampScore(parsed.suggestedScore, input.maxScore),
            maxScore: input.maxScore,
            confidence: normalizeConfidence(parsed.confidence),
            feedback: feedback.slice(0, 600),
        };
    } catch {
        return { status: "unavailable", reason: "generation_failed" };
    }
}
