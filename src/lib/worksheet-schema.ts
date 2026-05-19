import { z } from "zod";

const worksheetItemBaseSchema = z.object({
  id: z.string().trim().min(1),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(5).max(100),
  height: z.number().min(3).max(40),
});

const worksheetShortTextItemSchema = worksheetItemBaseSchema.extend({
  type: z.literal("short_text"),
  label: z.string().trim().min(1),
  placeholder: z.string().trim().max(120).default(""),
  answer: z.object({
    mode: z.enum(["exact", "normalized"]).default("normalized"),
    reviewMode: z.enum(["auto", "manual"]).default("auto"),
    accepted: z.array(z.string().trim().min(1)).min(1),
    points: z.number().int().min(1).max(100),
  }),
});

const worksheetMultipleChoiceItemSchema = worksheetItemBaseSchema.extend({
  type: z.literal("multiple_choice"),
  prompt: z.string().trim().min(1),
  options: z.array(z.string().trim().min(1)).min(2).max(4),
  correctIndex: z.number().int().min(0).max(3),
  points: z.number().int().min(1).max(100),
});

const worksheetBlankAnswerSchema = z.object({
  mode: z.enum(["exact", "normalized"]).default("normalized"),
  accepted: z.array(z.string().trim().min(1)).min(1),
});

const worksheetFillBlankBlankSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  placeholder: z.string().trim().max(120).default(""),
  answer: worksheetBlankAnswerSchema,
});

const worksheetFillBlankItemSchema = worksheetItemBaseSchema.extend({
  type: z.literal("fill_blank"),
  prompt: z.string().trim().min(1),
  blanks: z.array(worksheetFillBlankBlankSchema).min(2).max(6),
  pointsPerBlank: z.number().int().min(1).max(100),
});

const worksheetDragDropChoiceSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
});

const worksheetDragDropTargetSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  correctChoiceId: z.string().trim().min(1),
});

const worksheetDragDropItemSchema = worksheetItemBaseSchema.extend({
  type: z.literal("drag_drop"),
  prompt: z.string().trim().min(1),
  choices: z.array(worksheetDragDropChoiceSchema).min(2).max(6),
  targets: z.array(worksheetDragDropTargetSchema).min(2).max(6),
  pointsPerTarget: z.number().int().min(1).max(100),
});

const worksheetMatchingChoiceSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
});

const worksheetMatchingPromptSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  correctChoiceId: z.string().trim().min(1),
});

const worksheetMatchingItemSchema = worksheetItemBaseSchema.extend({
  type: z.literal("matching_pairs"),
  prompt: z.string().trim().min(1),
  prompts: z.array(worksheetMatchingPromptSchema).min(2).max(6),
  choices: z.array(worksheetMatchingChoiceSchema).min(2).max(6),
  pointsPerPair: z.number().int().min(1).max(100),
});

const worksheetMediaPromptItemSchema = worksheetItemBaseSchema.extend({
  type: z.literal("media_prompt"),
  prompt: z.string().trim().min(1),
  mediaType: z.enum(["audio", "video"]),
  mediaUrl: z.string().trim().min(1),
  placeholder: z.string().trim().max(120).default(""),
  answer: z.object({
    mode: z.enum(["exact", "normalized"]).default("normalized"),
    reviewMode: z.enum(["auto", "manual"]).default("auto"),
    accepted: z.array(z.string().trim().min(1)).min(1),
    points: z.number().int().min(1).max(100),
  }),
});

const worksheetChecklistOptionSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  correct: z.boolean().default(false),
});

const worksheetChecklistItemSchema = worksheetItemBaseSchema.extend({
  type: z.literal("checklist"),
  prompt: z.string().trim().min(1),
  options: z.array(worksheetChecklistOptionSchema).min(2).max(6),
  pointsPerCorrect: z.number().int().min(1).max(100),
});

const worksheetFileUploadItemSchema = worksheetItemBaseSchema.extend({
  type: z.literal("file_upload"),
  prompt: z.string().trim().min(1),
  allowedType: z.enum(["any", "document", "image", "audio", "video"]).default("any"),
  points: z.number().int().min(1).max(100),
});

const worksheetSpeakingItemSchema = worksheetItemBaseSchema.extend({
  type: z.literal("speaking"),
  prompt: z.string().trim().min(1),
  points: z.number().int().min(1).max(100),
});

export const worksheetItemSchema = z.discriminatedUnion("type", [
  worksheetShortTextItemSchema,
  worksheetMultipleChoiceItemSchema,
  worksheetFillBlankItemSchema,
  worksheetDragDropItemSchema,
  worksheetMatchingItemSchema,
  worksheetMediaPromptItemSchema,
  worksheetChecklistItemSchema,
  worksheetFileUploadItemSchema,
  worksheetSpeakingItemSchema,
]);

export const worksheetPageSchema = z.object({
  id: z.string().trim().min(1),
  pageNumber: z.number().int().min(1),
  backgroundUrl: z.string().trim().min(1),
  width: z.number().int().min(320).max(4000).default(1200),
  height: z.number().int().min(320).max(6000).default(1600),
  items: z.array(worksheetItemSchema).min(1),
});

export const worksheetDataSchema = z.object({
  version: z.literal(1),
  source: z.object({
    type: z.enum(["image", "pdf"]).default("image"),
    url: z.string().trim().min(1),
    originalFileName: z.string().trim().optional(),
    pageCount: z.number().int().min(1).max(200).optional(),
  }),
  pages: z.array(worksheetPageSchema).min(1),
  settings: z.object({
    showScoreToStudent: z.boolean().default(true),
    allowResubmit: z.boolean().default(false),
    shuffleItems: z.boolean().default(false),
  }),
});

export type WorksheetData = z.infer<typeof worksheetDataSchema>;
export type WorksheetPage = z.infer<typeof worksheetPageSchema>;
export type WorksheetItem = z.infer<typeof worksheetItemSchema>;
export type WorksheetShortTextItem = z.infer<typeof worksheetShortTextItemSchema>;
export type WorksheetMultipleChoiceItem = z.infer<typeof worksheetMultipleChoiceItemSchema>;
export type WorksheetFillBlankItem = z.infer<typeof worksheetFillBlankItemSchema>;
export type WorksheetDragDropItem = z.infer<typeof worksheetDragDropItemSchema>;
export type WorksheetMatchingItem = z.infer<typeof worksheetMatchingItemSchema>;
export type WorksheetMediaPromptItem = z.infer<typeof worksheetMediaPromptItemSchema>;
export type WorksheetChecklistItem = z.infer<typeof worksheetChecklistItemSchema>;
export type WorksheetFileUploadItem = z.infer<typeof worksheetFileUploadItemSchema>;
export type WorksheetSpeakingItem = z.infer<typeof worksheetSpeakingItemSchema>;

export type WorksheetStudentAnswerValue = string | number | string[] | Record<string, string> | boolean[];
export type WorksheetStudentAnswers = Record<string, WorksheetStudentAnswerValue>;

function normalizeWorksheetText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function validateWorksheetData(
  input: unknown
): { ok: true; data: WorksheetData } | { ok: false; code: "INVALID_WORKSHEET_DATA" } {
  const parsed = worksheetDataSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "INVALID_WORKSHEET_DATA" };
  }

  for (const page of parsed.data.pages) {
    for (const item of page.items) {
      if (item.type === "multiple_choice" && item.correctIndex >= item.options.length) {
        return { ok: false, code: "INVALID_WORKSHEET_DATA" };
      }
      if (item.type === "drag_drop") {
        if (item.targets.length > item.choices.length) {
          return { ok: false, code: "INVALID_WORKSHEET_DATA" };
        }
        const choiceIds = new Set(item.choices.map((choice) => choice.id));
        if (choiceIds.size !== item.choices.length) {
          return { ok: false, code: "INVALID_WORKSHEET_DATA" };
        }
        const targetIds = new Set(item.targets.map((target) => target.id));
        if (targetIds.size !== item.targets.length) {
          return { ok: false, code: "INVALID_WORKSHEET_DATA" };
        }
        const allTargetsResolvable = item.targets.every((target) => choiceIds.has(target.correctChoiceId));
        if (!allTargetsResolvable) {
          return { ok: false, code: "INVALID_WORKSHEET_DATA" };
        }
      }
      if (item.type === "matching_pairs") {
        if (item.prompts.length > item.choices.length) {
          return { ok: false, code: "INVALID_WORKSHEET_DATA" };
        }
        const choiceIds = new Set(item.choices.map((choice) => choice.id));
        if (choiceIds.size !== item.choices.length) {
          return { ok: false, code: "INVALID_WORKSHEET_DATA" };
        }
        const promptIds = new Set(item.prompts.map((prompt) => prompt.id));
        if (promptIds.size !== item.prompts.length) {
          return { ok: false, code: "INVALID_WORKSHEET_DATA" };
        }
        const allPromptsResolvable = item.prompts.every((prompt) => choiceIds.has(prompt.correctChoiceId));
        if (!allPromptsResolvable) {
          return { ok: false, code: "INVALID_WORKSHEET_DATA" };
        }
      }
      if (item.type === "checklist") {
        if (!item.options.some((option) => option.correct)) {
          return { ok: false, code: "INVALID_WORKSHEET_DATA" };
        }
        const optionIds = new Set(item.options.map((option) => option.id));
        if (optionIds.size !== item.options.length) {
          return { ok: false, code: "INVALID_WORKSHEET_DATA" };
        }
      }
    }
  }

  return { ok: true, data: parsed.data };
}

export function sanitizeWorksheetForStudent(data: WorksheetData) {
  return {
    version: data.version,
    source: data.source,
    pages: data.pages.map((page) => ({
      id: page.id,
      pageNumber: page.pageNumber,
      backgroundUrl: page.backgroundUrl,
      width: page.width,
      height: page.height,
      items: page.items.map((item) => {
        if (item.type === "short_text") {
          return {
            id: item.id,
            type: item.type,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            label: item.label,
            placeholder: item.placeholder,
          };
        }

        if (item.type === "multiple_choice") {
          return {
            id: item.id,
            type: item.type,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            prompt: item.prompt,
            options: item.options,
          };
        }

        if (item.type === "fill_blank") {
          return {
            id: item.id,
            type: item.type,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            prompt: item.prompt,
            blanks: item.blanks.map((blank) => ({
              id: blank.id,
              label: blank.label,
              placeholder: blank.placeholder,
            })),
          };
        }

        if (item.type === "drag_drop") {
          return {
            id: item.id,
            type: item.type,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            prompt: item.prompt,
            choices: item.choices,
            targets: item.targets.map((target) => ({
              id: target.id,
              label: target.label,
            })),
          };
        }

        if (item.type === "matching_pairs") {
          return {
            id: item.id,
            type: item.type,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            prompt: item.prompt,
            choices: item.choices,
            prompts: item.prompts.map((prompt) => ({
              id: prompt.id,
              label: prompt.label,
            })),
          };
        }

        if (item.type === "media_prompt") {
          return {
            id: item.id,
            type: item.type,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            prompt: item.prompt,
            mediaType: item.mediaType,
            mediaUrl: item.mediaUrl,
            placeholder: item.placeholder,
          };
        }

        if (item.type === "file_upload") {
          return {
            id: item.id,
            type: item.type,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            prompt: item.prompt,
            allowedType: item.allowedType,
          };
        }

        if (item.type === "speaking") {
          return {
            id: item.id,
            type: item.type,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            prompt: item.prompt,
          };
        }

        return {
          id: item.id,
          type: item.type,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          prompt: item.prompt,
          options: item.options.map((option) => ({
            id: option.id,
            label: option.label,
          })),
        };
      }),
    })),
    settings: data.settings,
  };
}

export type StudentWorksheetView = ReturnType<typeof sanitizeWorksheetForStudent>;
export type StudentWorksheetPage = StudentWorksheetView["pages"][number];
export type StudentWorksheetItem = StudentWorksheetPage["items"][number];

export function buildDefaultWorksheetData(backgroundUrl = ""): WorksheetData {
  return {
    version: 1,
    source: {
      type: "image",
      url: backgroundUrl,
    },
    pages: [
      {
        id: "page-1",
        pageNumber: 1,
        backgroundUrl,
        width: 1200,
        height: 1600,
        items: [],
      },
    ],
    settings: {
      showScoreToStudent: true,
      allowResubmit: false,
      shuffleItems: false,
    },
  };
}

export function normalizeWorksheetAcceptedAnswers(raw: string) {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function scoreWorksheetShortText(
  answer: string,
  item: WorksheetShortTextItem
): boolean {
  if (item.answer.mode === "exact") {
    return item.answer.accepted.some((candidate) => candidate.trim() === answer.trim());
  }

  const normalizedAnswer = normalizeWorksheetText(answer);
  return item.answer.accepted.some(
    (candidate) => normalizeWorksheetText(candidate) === normalizedAnswer
  );
}

export function scoreWorksheetBlankAnswer(
  answer: string,
  answerKey: { mode: "exact" | "normalized"; accepted: string[] }
): boolean {
  if (answerKey.mode === "exact") {
    return answerKey.accepted.some((candidate) => candidate.trim() === answer.trim());
  }

  const normalizedAnswer = normalizeWorksheetText(answer);
  return answerKey.accepted.some(
    (candidate) => normalizeWorksheetText(candidate) === normalizedAnswer
  );
}
