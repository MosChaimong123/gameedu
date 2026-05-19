import {
  scoreWorksheetBlankAnswer,
  scoreWorksheetShortText,
  type WorksheetData,
  type WorksheetStudentAnswers,
} from "@/lib/worksheet-schema";

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

      if (item.type === "fill_blank") {
        const rawAnswer = studentAnswers[item.id];
        const answers = Array.isArray(rawAnswer)
          ? rawAnswer.map((entry) => (typeof entry === "string" ? entry : ""))
          : [];
        let itemScore = 0;

        for (const [blankIndex, blank] of item.blanks.entries()) {
          const correct = scoreWorksheetBlankAnswer(answers[blankIndex] ?? "", blank.answer);
          if (correct) {
            itemScore += item.pointsPerBlank;
          }
        }

        const itemMaxScore = item.blanks.length * item.pointsPerBlank;
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

      if (item.type === "drag_drop") {
        const rawAnswer = studentAnswers[item.id];
        const placements =
          rawAnswer && typeof rawAnswer === "object" && !Array.isArray(rawAnswer)
            ? rawAnswer
            : {};
        let itemScore = 0;

        for (const target of item.targets) {
          const assignedChoiceId = typeof placements[target.id] === "string" ? placements[target.id] : "";
          if (assignedChoiceId === target.correctChoiceId) {
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

      if (item.type === "media_prompt") {
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
        const correct = scoreWorksheetBlankAnswer(answer, item.answer);
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

      if (item.type === "checklist") {
        const rawAnswer = studentAnswers[item.id];
        const answers = Array.isArray(rawAnswer)
          ? rawAnswer.map((entry) => Boolean(entry))
          : [];
        let itemScore = 0;

        for (const [optionIndex, option] of item.options.entries()) {
          const selected = Boolean(answers[optionIndex]);
          if (selected && option.correct) {
            itemScore += item.pointsPerCorrect;
          }
        }

        const itemMaxScore =
          item.options.filter((option) => option.correct).length * item.pointsPerCorrect;
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

      if (item.type === "file_upload" || item.type === "speaking") {
        maxScore += item.points;
        itemResults.push({
          itemId: item.id,
          correct: null,
          score: 0,
          maxScore: item.points,
          needsReview: true,
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
