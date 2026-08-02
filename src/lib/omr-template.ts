export const OMR_TEMPLATE_ID = "thai-50-v1";
export const OMR_QUESTION_COUNT = 50;
export const OMR_STUDENT_CODE_LENGTH = 5;
export const OMR_CANONICAL_WIDTH = 1000;
export const OMR_CANONICAL_HEIGHT = 1414;

export const OMR_OPTION_VALUES = ["A", "B", "C", "D", "E"] as const;
export const OMR_OPTION_LABELS_TH = ["ก", "ข", "ค", "ง", "จ"] as const;
export const OMR_STUDENT_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"] as const;

export type OmrOptionValue = (typeof OMR_OPTION_VALUES)[number];
export type OmrPoint = { x: number; y: number };
export type OmrMarker = OmrPoint & { id: string; size: number };
export type OmrAnswerGeometry = {
  question: number;
  label: OmrPoint;
  bubbles: Array<OmrPoint & { value: OmrOptionValue; label: string }>;
};
export type OmrStudentDigitGeometry = {
  position: number;
  bubbles: Array<OmrPoint & { value: string }>;
};

const QUESTION_COLUMNS = [
  { firstQuestion: 1, x: 209, y: 817 },
  { firstQuestion: 11, x: 449, y: 289 },
  { firstQuestion: 21, x: 449, y: 817 },
  { firstQuestion: 31, x: 686, y: 289 },
  { firstQuestion: 41, x: 686, y: 817 },
] as const;

const OPTION_SPACING = 38;
const QUESTION_SPACING = 48;
export const OMR_BUBBLE_RADIUS = 14;

export const OMR_OUTER_MARKERS: OmrMarker[] = [
  { id: "top-left", x: 75, y: 72, size: 30 },
  { id: "top-right", x: 925, y: 72, size: 30 },
  { id: "middle-left", x: 75, y: 707, size: 30 },
  { id: "middle-right", x: 925, y: 707, size: 30 },
  { id: "bottom-left", x: 75, y: 1342, size: 30 },
  { id: "bottom-right", x: 925, y: 1342, size: 30 },
];

export const OMR_REGISTRATION_MARKERS: OmrMarker[] = [
  ...OMR_OUTER_MARKERS,
  { id: "column-2-top", x: 410, y: 247, size: 24 },
  { id: "column-3-top", x: 647, y: 247, size: 24 },
  { id: "column-2-middle", x: 410, y: 772, size: 24 },
  { id: "column-3-middle", x: 647, y: 772, size: 24 },
  { id: "column-2-bottom", x: 410, y: 1292, size: 24 },
  { id: "column-3-bottom", x: 647, y: 1292, size: 24 },
];

export const OMR_ANSWER_GEOMETRY: OmrAnswerGeometry[] = QUESTION_COLUMNS.flatMap(
  ({ firstQuestion, x, y }) =>
    Array.from({ length: 10 }, (_, row) => {
      const question = firstQuestion + row;
      const rowY = y + row * QUESTION_SPACING;
      return {
        question,
        label: { x: x - 34, y: rowY + 6 },
        bubbles: OMR_OPTION_VALUES.map((value, optionIndex) => ({
          value,
          label: OMR_OPTION_LABELS_TH[optionIndex],
          x: x + optionIndex * OPTION_SPACING,
          y: rowY,
        })),
      };
    })
);

export const OMR_STUDENT_ID_GEOMETRY: OmrStudentDigitGeometry[] = Array.from(
  { length: OMR_STUDENT_CODE_LENGTH },
  (_, position) => ({
    position,
    bubbles: OMR_STUDENT_DIGITS.map((value, row) => ({
      value,
      x: 209 + position * OPTION_SPACING,
      y: 289 + row * QUESTION_SPACING,
    })),
  })
);

export function getOmrQuestionGeometry(question: number) {
  return OMR_ANSWER_GEOMETRY.find((item) => item.question === question) ?? null;
}

export function isOmrOptionValue(value: unknown): value is OmrOptionValue {
  return typeof value === "string" && OMR_OPTION_VALUES.includes(value as OmrOptionValue);
}

export function isOmrStudentCode(value: unknown): value is string {
  return typeof value === "string" && new RegExp(`^\\d{${OMR_STUDENT_CODE_LENGTH}}$`).test(value);
}
