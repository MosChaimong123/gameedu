import {
  scoreWorksheetShortText,
  type WorksheetData,
  type WorksheetStudentAnswers,
} from "@/lib/worksheet-schema";

/** Parse a word_search answer string like "3,7,12" into unique cell indexes. */
export function parseWordSearchSelectedCells(raw: unknown): number[] {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return [];
  }
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((value) => Number.isInteger(value) && value >= 0)
    )
  );
}

export type WorksheetGradeResult = {
  score: number;
  maxScore: number;
  itemResults: Array<{
    itemId: string;
    correct: boolean | null;
    score: number;
    maxScore: number;
    needsReview: boolean;
  }>;
};

export function gradeWorksheetSubmission(
  worksheet: WorksheetData,
  studentAnswers: WorksheetStudentAnswers
): WorksheetGradeResult {
  const itemResults: WorksheetGradeResult["itemResults"] = [];
  let score = 0;
  let maxScore = 0;

  for (const page of worksheet.pages) {
    for (const item of page.items) {
      if (item.type === "short_text") {
        const rawAnswer = studentAnswers[item.id];
        const answer = typeof rawAnswer === "string" ? rawAnswer : "";
        if (item.answer.reviewMode === "manual") {
          maxScore += item.answer.points;
          itemResults.push({
            itemId: item.id,
            correct: null,
            score: 0,
            maxScore: item.answer.points,
            needsReview: true,
          });
          continue;
        }
        const correct = scoreWorksheetShortText(answer, item);
        const itemScore = correct ? item.answer.points : 0;
        score += itemScore;
        maxScore += item.answer.points;
        itemResults.push({
          itemId: item.id,
          correct,
          score: itemScore,
          maxScore: item.answer.points,
          needsReview: false,
        });
        continue;
      }

      if (item.type === "drag_drop") {
        const rawAnswer = studentAnswers[item.id];
        const placements =
          rawAnswer && typeof rawAnswer === "object" && !Array.isArray(rawAnswer)
            ? rawAnswer
            : {};
        let itemScore = 0;

        for (const target of item.targets) {
          const rawPlacement = placements[target.id];
          const assignedChoiceIds = Array.isArray(rawPlacement)
            ? rawPlacement.filter((entry): entry is string => typeof entry === "string")
            : typeof rawPlacement === "string"
              ? [rawPlacement]
              : [];
          const acceptedChoiceIds =
            target.acceptedChoiceIds && target.acceptedChoiceIds.length > 0
              ? target.acceptedChoiceIds
              : [target.correctChoiceId];
          const hasEveryAcceptedChoice = acceptedChoiceIds.every((choiceId) =>
            assignedChoiceIds.includes(choiceId)
          );
          const hasOnlyAcceptedChoices = assignedChoiceIds.every((choiceId) =>
            acceptedChoiceIds.includes(choiceId)
          );
          if (hasEveryAcceptedChoice && hasOnlyAcceptedChoices) {
            itemScore += item.pointsPerTarget;
          }
        }

        const itemMaxScore = item.targets.length * item.pointsPerTarget;
        score += itemScore;
        maxScore += itemMaxScore;
        itemResults.push({
          itemId: item.id,
          correct: itemScore === itemMaxScore,
          score: itemScore,
          maxScore: itemMaxScore,
          needsReview: false,
        });
        continue;
      }

      if (item.type === "drag_select") {
        const rawAnswer = studentAnswers[item.id];
        const choiceId = typeof rawAnswer === "string" ? rawAnswer : "";
        const correct = choiceId === item.correctChoiceId;
        const itemScore = correct ? item.points : 0;
        score += itemScore;
        maxScore += item.points;
        itemResults.push({
          itemId: item.id,
          correct,
          score: itemScore,
          maxScore: item.points,
          needsReview: false,
        });
        continue;
      }

      if (item.type === "matching_pairs") {
        const rawAnswer = studentAnswers[item.id];
        const pairings =
          rawAnswer && typeof rawAnswer === "object" && !Array.isArray(rawAnswer)
            ? rawAnswer
            : {};
        let itemScore = 0;

        for (const prompt of item.prompts) {
          const selectedChoiceId = typeof pairings[prompt.id] === "string" ? pairings[prompt.id] : "";
          if (selectedChoiceId === prompt.correctChoiceId) {
            itemScore += item.pointsPerPair;
          }
        }

        const itemMaxScore = item.prompts.length * item.pointsPerPair;
        score += itemScore;
        maxScore += itemMaxScore;
        itemResults.push({
          itemId: item.id,
          correct: itemScore === itemMaxScore,
          score: itemScore,
          maxScore: itemMaxScore,
          needsReview: false,
        });
        continue;
      }

      if (item.type === "word_search") {
        const selectedCells = parseWordSearchSelectedCells(studentAnswers[item.id]);
        const answerSet = new Set(item.answerCells);
        const correctCount = selectedCells.filter((cellIndex) => answerSet.has(cellIndex)).length;
        const wrongCount = selectedCells.length - correctCount;
        // Wrong picks cancel correct ones so select-everything scores zero.
        const earnedCells = Math.max(0, correctCount - wrongCount);

        const itemScore = earnedCells * item.pointsPerCell;
        const itemMaxScore = item.answerCells.length * item.pointsPerCell;
        score += itemScore;
        maxScore += itemMaxScore;
        itemResults.push({
          itemId: item.id,
          correct: correctCount === item.answerCells.length && wrongCount === 0,
          score: itemScore,
          maxScore: itemMaxScore,
          needsReview: false,
        });
        continue;
      }

      const rawAnswer = studentAnswers[item.id];
      const selectedIndex = typeof rawAnswer === "number" ? rawAnswer : -1;
      const correct = selectedIndex === item.correctIndex;
      const itemScore = correct ? item.points : 0;
      score += itemScore;
      maxScore += item.points;
      itemResults.push({
        itemId: item.id,
        correct,
        score: itemScore,
        maxScore: item.points,
        needsReview: false,
      });
    }
  }

  return {
    score,
    maxScore,
    itemResults,
  };
}
