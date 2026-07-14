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

const worksheetDragDropAreaSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(1).max(100),
  height: z.number().min(1).max(100),
});

const worksheetDragDropChoiceSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  sourceArea: worksheetDragDropAreaSchema,
});

const worksheetDragDropTargetSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  correctChoiceId: z.string().trim().min(1),
  acceptedChoiceIds: z.array(z.string().trim().min(1)).optional(),
  dropArea: worksheetDragDropAreaSchema,
});

const worksheetDragDropItemSchema = worksheetItemBaseSchema.extend({
  type: z.literal("drag_drop"),
  prompt: z.string().trim().min(1),
  choices: z.array(worksheetDragDropChoiceSchema).min(1).max(6),
  targets: z.array(worksheetDragDropTargetSchema).min(1).max(6),
  pointsPerTarget: z.number().int().min(1).max(100),
});

const worksheetMatchingChoiceSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  sourceArea: worksheetDragDropAreaSchema,
});

const worksheetMatchingPromptSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  correctChoiceId: z.string().trim().min(1),
  sourceArea: worksheetDragDropAreaSchema,
});

const worksheetDragSelectItemSchema = worksheetItemBaseSchema.extend({
  type: z.literal("drag_select"),
  prompt: z.string().trim().min(1),
  choices: z.array(z.object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    sourceArea: worksheetDragDropAreaSchema,
  })).min(2).max(6),
  dropArea: worksheetDragDropAreaSchema,
  correctChoiceId: z.string().trim().min(1),
  points: z.number().int().min(1).max(100),
});

const worksheetMatchingItemSchema = worksheetItemBaseSchema.extend({
  type: z.literal("matching_pairs"),
  prompt: z.string().trim().min(1),
  prompts: z.array(worksheetMatchingPromptSchema).min(2).max(6),
  choices: z.array(worksheetMatchingChoiceSchema).min(2).max(6),
  pointsPerPair: z.number().int().min(1).max(100),
});

const worksheetWordSearchItemSchema = worksheetItemBaseSchema.extend({
  type: z.literal("word_search"),
  prompt: z.string().trim().min(1),
  // The letters themselves live in the page's background image; this item is
  // just a transparent rows x cols grid overlaid on top of it (positioned via
  // the base x/y/width/height) so the teacher can mark which cells are correct.
  rows: z.number().int().min(4).max(15),
  cols: z.number().int().min(4).max(15),
  // Row-major indexes of the cells the teacher marked as the answer.
  answerCells: z.array(z.number().int().min(0)).min(1),
  pointsPerCell: z.number().int().min(1).max(100),
});

export const worksheetItemSchema = z.discriminatedUnion("type", [
  worksheetShortTextItemSchema,
  worksheetMultipleChoiceItemSchema,
  worksheetDragDropItemSchema,
  worksheetDragSelectItemSchema,
  worksheetMatchingItemSchema,
  worksheetWordSearchItemSchema,
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
export type WorksheetDragDropItem = z.infer<typeof worksheetDragDropItemSchema>;
export type WorksheetDragSelectItem = z.infer<typeof worksheetDragSelectItemSchema>;
export type WorksheetMatchingItem = z.infer<typeof worksheetMatchingItemSchema>;
export type WorksheetWordSearchItem = z.infer<typeof worksheetWordSearchItemSchema>;

export type WorksheetStudentAnswerValue = string | number | Record<string, string | string[]>;
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
        const allTargetsResolvable = item.targets.every((target) => {
          const acceptedChoiceIds =
            target.acceptedChoiceIds && target.acceptedChoiceIds.length > 0
              ? target.acceptedChoiceIds
              : [target.correctChoiceId];
          return acceptedChoiceIds.every((choiceId) => choiceIds.has(choiceId));
        });
        if (!allTargetsResolvable) {
          return { ok: false, code: "INVALID_WORKSHEET_DATA" };
        }
      }
      if (item.type === "drag_select") {
        const choiceIds = new Set(item.choices.map((choice) => choice.id));
        if (choiceIds.size !== item.choices.length) {
          return { ok: false, code: "INVALID_WORKSHEET_DATA" };
        }
        if (!choiceIds.has(item.correctChoiceId)) {
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
      if (item.type === "word_search") {
        const uniqueAnswerCells = new Set(item.answerCells);
        if (uniqueAnswerCells.size !== item.answerCells.length) {
          return { ok: false, code: "INVALID_WORKSHEET_DATA" };
        }
        const everyCellInBounds = item.answerCells.every(
          (cellIndex) => cellIndex < item.rows * item.cols
        );
        if (!everyCellInBounds) {
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

        if (item.type === "drag_drop") {
          return {
            id: item.id,
            type: item.type,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            prompt: item.prompt,
            choices: item.choices.map((choice) => ({
              id: choice.id,
              label: choice.label,
              sourceArea: choice.sourceArea,
            })),
            targets: item.targets.map((target) => ({
              id: target.id,
              label: target.label,
              acceptedChoiceIds: target.acceptedChoiceIds,
              dropArea: target.dropArea,
            })),
          };
        }

        if (item.type === "drag_select") {
          return {
            id: item.id,
            type: item.type,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            prompt: item.prompt,
            choices: item.choices.map((choice) => ({
              id: choice.id,
              label: choice.label,
              sourceArea: choice.sourceArea,
            })),
            dropArea: item.dropArea,
          };
        }

        if (item.type === "word_search") {
          // answerCells stay server-side; students just see the (background-image)
          // grid overlay and tap cells.
          return {
            id: item.id,
            type: item.type,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            prompt: item.prompt,
            rows: item.rows,
            cols: item.cols,
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
          choices: item.choices.map((choice) => ({
            id: choice.id,
            label: choice.label,
            sourceArea: choice.sourceArea,
          })),
          prompts: item.prompts.map((prompt) => ({
            id: prompt.id,
            label: prompt.label,
            sourceArea: prompt.sourceArea,
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
