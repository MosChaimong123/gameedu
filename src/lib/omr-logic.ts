import type { OmrDetectedAnswer } from "@/lib/omr-grading";
import {
  OMR_ANSWER_GEOMETRY,
  OMR_CANONICAL_HEIGHT,
  OMR_CANONICAL_WIDTH,
  OMR_OUTER_MARKERS,
  OMR_STUDENT_ID_GEOMETRY,
  type OmrPoint,
} from "@/lib/omr-template";

type OpenCVMatrix = {
  cols: number;
  rows: number;
  delete: () => void;
  roi: (rect: unknown) => OpenCVMatrix;
};

type OpenCVContourVector = {
  delete: () => void;
  size: () => number;
  get: (index: number) => OpenCVMatrix;
};

export type OpenCVRuntime = {
  imread: (imageSource: HTMLImageElement | HTMLCanvasElement) => OpenCVMatrix;
  Mat: new () => OpenCVMatrix;
  MatVector: new () => OpenCVContourVector;
  Rect: new (x: number, y: number, width: number, height: number) => unknown;
  Size: new (width: number, height: number) => unknown;
  cvtColor: (...args: unknown[]) => void;
  adaptiveThreshold: (...args: unknown[]) => void;
  findContours: (...args: unknown[]) => void;
  boundingRect: (contour: unknown) => { x: number; y: number; width: number; height: number };
  matFromArray: (...args: unknown[]) => OpenCVMatrix;
  getPerspectiveTransform: (src: OpenCVMatrix, dst: OpenCVMatrix) => OpenCVMatrix;
  warpPerspective: (...args: unknown[]) => void;
  mean: (roi: OpenCVMatrix) => number[];
  COLOR_RGBA2GRAY: number;
  ADAPTIVE_THRESH_GAUSSIAN_C: number;
  THRESH_BINARY_INV: number;
  RETR_EXTERNAL: number;
  CHAIN_APPROX_SIMPLE: number;
  CV_32FC2: number;
  INTER_LINEAR?: number;
  BORDER_CONSTANT?: number;
};

type MarkerCandidate = OmrPoint & {
  fillRatio: number;
};

export type OmrProcessResult =
  | {
      success: true;
      messageKey: "omrProcessReadyForReview";
      data: OmrDetectedAnswer[];
      studentCode: string | null;
      studentCodeConfidence: number;
      ambiguousQuestions: number[];
    }
  | {
      success: false;
      messageKey:
        | "omrProcessMarkersMissing"
        | "omrProcessStudentCodeUnclear"
        | "omrProcessingError";
    };

const MARKER_MIN_FILL_RATIO = 0.48;
const BUBBLE_MIN_DARKNESS = 78;
const BUBBLE_SECOND_MARK_DARKNESS = 62;
const BUBBLE_MIN_MARGIN = 30;
const SAMPLE_RADIUS = 7;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function sampleDarkness(
  cv: OpenCVRuntime,
  matrix: OpenCVMatrix,
  point: OmrPoint,
  radius = SAMPLE_RADIUS
) {
  const x = Math.max(0, Math.round(point.x - radius));
  const y = Math.max(0, Math.round(point.y - radius));
  const width = Math.min(radius * 2, matrix.cols - x);
  const height = Math.min(radius * 2, matrix.rows - y);
  if (width <= 0 || height <= 0) return 0;
  const roi = matrix.roi(new cv.Rect(x, y, width, height));
  const value = cv.mean(roi)[0] ?? 0;
  roi.delete();
  return value;
}

function findMarkerCandidates(
  cv: OpenCVRuntime,
  threshold: OpenCVMatrix,
  contours: OpenCVContourVector
): MarkerCandidate[] {
  const minDimension = Math.min(threshold.cols, threshold.rows);
  const candidates: MarkerCandidate[] = [];

  for (let index = 0; index < contours.size(); index += 1) {
    const contour = contours.get(index);
    const rect = cv.boundingRect(contour);
    contour.delete();
    const aspectRatio = rect.width / Math.max(rect.height, 1);
    const normalizedSize = Math.max(rect.width, rect.height) / minDimension;
    if (
      aspectRatio < 0.72 ||
      aspectRatio > 1.28 ||
      normalizedSize < 0.012 ||
      normalizedSize > 0.09
    ) {
      continue;
    }

    const roi = threshold.roi(new cv.Rect(rect.x, rect.y, rect.width, rect.height));
    const fillRatio = (cv.mean(roi)[0] ?? 0) / 255;
    roi.delete();
    if (fillRatio < MARKER_MIN_FILL_RATIO) continue;

    candidates.push({
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
      fillRatio,
    });
  }

  return candidates;
}

function pickCornerMarker(
  candidates: MarkerCandidate[],
  width: number,
  height: number,
  corner: "top-left" | "top-right" | "bottom-left" | "bottom-right"
) {
  const isLeft = corner.endsWith("left");
  const isTop = corner.startsWith("top");
  const eligible = candidates.filter((candidate) => {
    const horizontal = isLeft ? candidate.x < width * 0.32 : candidate.x > width * 0.68;
    const vertical = isTop ? candidate.y < height * 0.25 : candidate.y > height * 0.75;
    return horizontal && vertical;
  });
  const targetX = isLeft ? 0 : width;
  const targetY = isTop ? 0 : height;

  return (
    eligible.sort((a, b) => {
      const distanceA =
        Math.hypot((a.x - targetX) / width, (a.y - targetY) / height) -
        a.fillRatio * 0.04;
      const distanceB =
        Math.hypot((b.x - targetX) / width, (b.y - targetY) / height) -
        b.fillRatio * 0.04;
      return distanceA - distanceB;
    })[0] ?? null
  );
}

function classifyValues<T extends string>(
  samples: Array<{ value: T; darkness: number }>
): { value: T | null; confidence: number; ambiguous: boolean } {
  const sorted = [...samples].sort((a, b) => b.darkness - a.darkness);
  const first = sorted[0];
  const second = sorted[1];
  if (!first || first.darkness < BUBBLE_MIN_DARKNESS) {
    return { value: null, confidence: 1 - clamp01((first?.darkness ?? 0) / BUBBLE_MIN_DARKNESS), ambiguous: false };
  }

  const margin = first.darkness - (second?.darkness ?? 0);
  const ambiguous =
    (second?.darkness ?? 0) >= BUBBLE_SECOND_MARK_DARKNESS || margin < BUBBLE_MIN_MARGIN;
  return {
    // Never preselect an uncertain mark. The review UI must make the teacher
    // explicitly resolve double marks, shifted circles, and weak separation.
    value: ambiguous ? null : first.value,
    confidence: clamp01(margin / 120),
    ambiguous,
  };
}

export async function processOMR(
  cv: OpenCVRuntime,
  imageSource: HTMLImageElement | HTMLCanvasElement
): Promise<OmrProcessResult> {
  const src = cv.imread(imageSource);
  const gray = new cv.Mat();
  const threshold = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const warped = new cv.Mat();
  let sourceCoordinates: OpenCVMatrix | null = null;
  let destinationCoordinates: OpenCVMatrix | null = null;
  let perspective: OpenCVMatrix | null = null;

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.adaptiveThreshold(
      gray,
      threshold,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      31,
      10
    );
    cv.findContours(
      threshold,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE
    );

    const candidates = findMarkerCandidates(cv, threshold, contours);
    const detectedCorners = [
      pickCornerMarker(candidates, src.cols, src.rows, "top-left"),
      pickCornerMarker(candidates, src.cols, src.rows, "top-right"),
      pickCornerMarker(candidates, src.cols, src.rows, "bottom-left"),
      pickCornerMarker(candidates, src.cols, src.rows, "bottom-right"),
    ];
    if (detectedCorners.some((point) => point === null)) {
      return { success: false, messageKey: "omrProcessMarkersMissing" };
    }

    const [topLeft, topRight, bottomLeft, bottomRight] = detectedCorners as [
      MarkerCandidate,
      MarkerCandidate,
      MarkerCandidate,
      MarkerCandidate,
    ];
    sourceCoordinates = cv.matFromArray(4, 1, cv.CV_32FC2, [
      topLeft.x,
      topLeft.y,
      topRight.x,
      topRight.y,
      bottomLeft.x,
      bottomLeft.y,
      bottomRight.x,
      bottomRight.y,
    ]);
    const canonicalTopLeft = OMR_OUTER_MARKERS[0];
    const canonicalTopRight = OMR_OUTER_MARKERS[1];
    const canonicalBottomLeft = OMR_OUTER_MARKERS[4];
    const canonicalBottomRight = OMR_OUTER_MARKERS[5];
    destinationCoordinates = cv.matFromArray(4, 1, cv.CV_32FC2, [
      canonicalTopLeft.x,
      canonicalTopLeft.y,
      canonicalTopRight.x,
      canonicalTopRight.y,
      canonicalBottomLeft.x,
      canonicalBottomLeft.y,
      canonicalBottomRight.x,
      canonicalBottomRight.y,
    ]);
    perspective = cv.getPerspectiveTransform(sourceCoordinates, destinationCoordinates);
    cv.warpPerspective(
      threshold,
      warped,
      perspective,
      new cv.Size(OMR_CANONICAL_WIDTH, OMR_CANONICAL_HEIGHT)
    );

    const answers: OmrDetectedAnswer[] = OMR_ANSWER_GEOMETRY.map((geometry) => {
      const classified = classifyValues(
        geometry.bubbles.map((bubble) => ({
          value: bubble.value,
          darkness: sampleDarkness(cv, warped, bubble),
        }))
      );
      return {
        question: geometry.question,
        answer: classified.value,
        confidence: classified.confidence,
        ambiguous: classified.ambiguous,
      };
    });

    const detectedStudentDigits = OMR_STUDENT_ID_GEOMETRY.map((geometry) =>
      classifyValues(
        geometry.bubbles.map((bubble) => ({
          value: bubble.value,
          darkness: sampleDarkness(cv, warped, bubble),
        }))
      )
    );
    const studentCodeIsClear = detectedStudentDigits.every(
      (digit) => digit.value !== null && !digit.ambiguous
    );
    const studentCode = studentCodeIsClear
      ? detectedStudentDigits.map((digit) => digit.value).join("")
      : null;
    const studentCodeConfidence =
      detectedStudentDigits.reduce((sum, digit) => sum + digit.confidence, 0) /
      detectedStudentDigits.length;

    return {
      success: true,
      messageKey: "omrProcessReadyForReview",
      data: answers,
      studentCode,
      studentCodeConfidence,
      ambiguousQuestions: answers
        .filter((answer) => answer.ambiguous)
        .map((answer) => answer.question),
    };
  } catch (error) {
    console.error("[OMR_PROCESS]", error);
    return { success: false, messageKey: "omrProcessingError" };
  } finally {
    perspective?.delete();
    destinationCoordinates?.delete();
    sourceCoordinates?.delete();
    warped.delete();
    hierarchy.delete();
    contours.delete();
    threshold.delete();
    gray.delete();
    src.delete();
  }
}
