import { NextResponse } from "next/server";
import { loadQuizTakeContext } from "@/lib/quiz-take-context";
import {
  buildRateLimitKey,
  consumeRateLimit,
  createRateLimitResponse,
  getRequestClientIdentifier,
} from "@/lib/security/rate-limit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const { id, assignmentId } = await params;
  const rateLimit = consumeRateLimit({
    bucket: "quiz-check-answer:post",
    key: buildRateLimitKey(getRequestClientIdentifier(req), id, assignmentId),
    limit: 120,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  try {
    const body = (await req.json()) as {
      studentCode?: string;
      questionIndex?: unknown;
      selectedIndex?: unknown;
    };
    const studentCode = body.studentCode ?? "";
    const questionIndex =
      typeof body.questionIndex === "number" ? body.questionIndex : NaN;
    const selectedIndex =
      typeof body.selectedIndex === "number" ? body.selectedIndex : NaN;

    if (!studentCode.trim() || !Number.isFinite(questionIndex) || !Number.isFinite(selectedIndex)) {
      return new NextResponse("Bad Request", { status: 400 });
    }
    if (questionIndex < 0 || selectedIndex < 0) {
      return new NextResponse("Bad Request", { status: 400 });
    }

    const ctx = await loadQuizTakeContext(id, assignmentId, studentCode);
    if (ctx.kind === "denied") {
      return new NextResponse(ctx.message, { status: ctx.status });
    }
    if (ctx.kind === "already_submitted") {
      return new NextResponse("Already submitted", { status: 409 });
    }

    const q = ctx.questions[questionIndex];
    if (!q) {
      return new NextResponse("Invalid question index", { status: 400 });
    }
    const nOpts = Array.isArray(q.options) ? q.options.length : 0;
    if (selectedIndex >= nOpts) {
      return new NextResponse("Invalid option index", { status: 400 });
    }

    return NextResponse.json({ accepted: true });
  } catch (e) {
    console.error("[QUIZ_CHECK_ANSWER]", e);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
