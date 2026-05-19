import { z } from "zod";

const worksheetSubmissionItemResultSchema = z.object({
  itemId: z.string().trim().min(1),
  correct: z.boolean().nullable(),
  score: z.number().int().min(0),
  maxScore: z.number().int().min(0),
  needsReview: z.boolean(),
});

const worksheetSubmissionContentSchema = z.object({
  mode: z.literal("worksheet"),
  answers: z.record(z.string(), z.unknown()),
  itemResults: z.array(worksheetSubmissionItemResultSchema),
  reviewedAt: z.string().optional(),
});

export type WorksheetSubmissionItemResult = z.infer<
  typeof worksheetSubmissionItemResultSchema
>;
export type WorksheetSubmissionContent = z.infer<
  typeof worksheetSubmissionContentSchema
>;

export function parseWorksheetSubmissionContent(
  raw: string | null | undefined
): WorksheetSubmissionContent | null {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const validated = worksheetSubmissionContentSchema.safeParse(parsed);
    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
}
