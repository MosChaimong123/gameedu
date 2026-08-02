import {
  OMR_OPTION_VALUES,
  OMR_QUESTION_COUNT,
  isOmrOptionValue,
  type OmrOptionValue,
} from "@/lib/omr-template";

export type OmrDetectedAnswer = {
  question: number;
  answer: OmrOptionValue | null;
  confidence?: number;
  ambiguous?: boolean;
};

export type OmrGradedAnswer = OmrDetectedAnswer & {
  correctAnswer: OmrOptionValue;
  isCorrect: boolean;
};

export function parseOmrAnswerKey(
  value: unknown,
  options: { requireComplete?: boolean } = {}
):
  | { ok: true; answerKey: Record<string, OmrOptionValue | ""> }
  | { ok: false; message: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, message: "Answer key must be an object" };
  }

  const raw = value as Record<string, unknown>;
  const answerKey: Record<string, OmrOptionValue | ""> = {};
  for (let question = 1; question <= OMR_QUESTION_COUNT; question += 1) {
    const answer = raw[String(question)];
    if (answer === "" || answer === undefined || answer === null) {
      if (options.requireComplete) {
        return { ok: false, message: `Answer key is incomplete at question ${question}` };
      }
      answerKey[String(question)] = "";
      continue;
    }
    if (!isOmrOptionValue(answer)) {
      return {
        ok: false,
        message: `Answer for question ${question} must be one of ${OMR_OPTION_VALUES.join(", ")}`,
      };
    }
    answerKey[String(question)] = answer;
  }

  const unexpectedKey = Object.keys(raw).find((key) => {
    const question = Number(key);
    return !Number.isInteger(question) || question < 1 || question > OMR_QUESTION_COUNT;
  });
  if (unexpectedKey) {
    return { ok: false, message: `Unexpected answer key question: ${unexpectedKey}` };
  }

  return { ok: true, answerKey };
}

export function parseOmrDetectedAnswers(
  value: unknown
):
  | { ok: true; answers: OmrDetectedAnswer[] }
  | { ok: false; message: string } {
  if (!Array.isArray(value) || value.length !== OMR_QUESTION_COUNT) {
    return {
      ok: false,
      message: `Exactly ${OMR_QUESTION_COUNT} detected answers are required`,
    };
  }

  const seen = new Set<number>();
  const answers: OmrDetectedAnswer[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, message: "Each detected answer must be an object" };
    }
    const raw = item as Record<string, unknown>;
    const question = raw.question;
    if (
      !Number.isInteger(question) ||
      Number(question) < 1 ||
      Number(question) > OMR_QUESTION_COUNT ||
      seen.has(Number(question))
    ) {
      return { ok: false, message: "Detected answer question numbers are invalid" };
    }
    if (raw.answer !== null && !isOmrOptionValue(raw.answer)) {
      return { ok: false, message: `Detected answer for question ${question} is invalid` };
    }
    if (
      raw.confidence !== undefined &&
      (typeof raw.confidence !== "number" ||
        !Number.isFinite(raw.confidence) ||
        raw.confidence < 0 ||
        raw.confidence > 1)
    ) {
      return { ok: false, message: `Confidence for question ${question} is invalid` };
    }

    seen.add(Number(question));
    answers.push({
      question: Number(question),
      answer: raw.answer as OmrOptionValue | null,
      ...(typeof raw.confidence === "number" ? { confidence: raw.confidence } : {}),
      ...(typeof raw.ambiguous === "boolean" ? { ambiguous: raw.ambiguous } : {}),
    });
  }

  answers.sort((a, b) => a.question - b.question);
  return { ok: true, answers };
}

export function gradeOmrAnswers(
  answers: OmrDetectedAnswer[],
  answerKey: Record<string, OmrOptionValue>
): { score: number; total: number; answers: OmrGradedAnswer[] } {
  const graded = answers.map((item) => {
    const correctAnswer = answerKey[String(item.question)];
    return {
      ...item,
      correctAnswer,
      isCorrect: item.answer === correctAnswer,
    };
  });

  return {
    score: graded.filter((item) => item.isCorrect).length,
    total: OMR_QUESTION_COUNT,
    answers: graded,
  };
}
