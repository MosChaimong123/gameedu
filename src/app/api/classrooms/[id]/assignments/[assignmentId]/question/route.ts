import { NextResponse } from "next/server";
import { loadQuizTakeContext } from "@/lib/quiz-take-context";
import {
  QUIZ_PLAIN_ERR_ALREADY_SUBMITTED,
  QUIZ_PLAIN_ERR_INTERNAL,
  QUIZ_PLAIN_ERR_INVALID_INDEX,
} from "@/lib/quiz-load-error-messages";
import {
  buildRateLimitKey,
  consumeRateLimit,
  createRateLimitResponse,
  getRequestClientIdentifier,
} from "@/lib/security/rate-limit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const { id, assignmentId } = await params;
  const url = new URL(req.url);
  const studentCode = url.searchParams.get("studentCode") ?? "";
  const indexRaw = url.searchParams.get("index") ?? "0";
  const index = parseInt(indexRaw, 10);

  const rateLimit = consumeRateLimit({
    bucket: "quiz-question:get",
    key: buildRateLimitKey(
      getRequestClientIdentifier(req),
      id,
      assignmentId,
      studentCode.trim().toUpperCase()
    ),
    limit: 90,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  if (!Number.isFinite(index) || index < 0) {
    return new NextResponse(QUIZ_PLAIN_ERR_INVALID_INDEX, { status: 400 });
  }

  try {
    const ctx = await loadQuizTakeContext(id, assignmentId, studentCode);
    if (ctx.kind === "denied") {
      return new NextResponse(ctx.message, { status: ctx.status });
    }
    if (ctx.kind === "already_submitted") {
      return new NextResponse(QUIZ_PLAIN_ERR_ALREADY_SUBMITTED, { status: 409 });
    }

    if (index >= ctx.questions.length) {
      return new NextResponse(QUIZ_PLAIN_ERR_INVALID_INDEX, { status: 400 });
    }

    const q = ctx.questions[index];
    return NextResponse.json({
      index,
      total: ctx.questions.length,
      question: {
        id: q.id,
        question: q.question,
        options: q.options,
      },
    });
  } catch (e) {
    console.error("[QUIZ_QUESTION_GET]", e);
    return new NextResponse(QUIZ_PLAIN_ERR_INTERNAL, { status: 500 });
  }
}
