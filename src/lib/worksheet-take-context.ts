import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import { parseWorksheetDataFromAssignmentPayload } from "@/lib/worksheet-assignment";
import type { WorksheetData } from "@/lib/worksheet-schema";

export const WORKSHEET_ERR_BAD_REQUEST = "Bad Request";
export const WORKSHEET_ERR_STUDENT_NOT_FOUND = "Student not found";
export const WORKSHEET_ERR_NOT_WORKSHEET_ASSIGNMENT = "Worksheet assignment not found";
export const WORKSHEET_ERR_ASSIGNMENT_CLOSED = "Worksheet is closed";
export const WORKSHEET_ERR_NO_WORKSHEET = "Worksheet data is missing";

export type WorksheetTakeContextResult =
  | {
      kind: "ok";
      studentId: string;
      studentCode: string;
      assignmentName: string;
      maxScore: number;
      worksheet: WorksheetData;
      showScoreToStudent: boolean;
      allowResubmit: boolean;
      hasPreviousSubmission: boolean;
    }
  | { kind: "already_submitted"; score: number }
  | { kind: "denied"; status: number; message: string };

export async function loadWorksheetTakeContext(
  classId: string,
  assignmentId: string,
  studentCode: string
): Promise<WorksheetTakeContextResult> {
  const trimmed = studentCode.trim();
  if (!trimmed) {
    return { kind: "denied", status: 400, message: WORKSHEET_ERR_BAD_REQUEST };
  }

  const student = await db.student.findFirst({
    where: {
      classId,
      OR: getStudentLoginCodeVariants(trimmed).map((loginCode) => ({ loginCode })),
    },
    select: { id: true, loginCode: true },
  });
  if (!student) {
    return { kind: "denied", status: 404, message: WORKSHEET_ERR_STUDENT_NOT_FOUND };
  }

  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId, classId },
    select: {
      type: true,
      name: true,
      visible: true,
      deadline: true,
      maxScore: true,
      quizData: true,
    },
  });

  if (!assignment || assignment.type !== "worksheet" || !assignment.visible) {
    return { kind: "denied", status: 400, message: WORKSHEET_ERR_NOT_WORKSHEET_ASSIGNMENT };
  }
  if (assignment.deadline && new Date(assignment.deadline) < new Date()) {
    return { kind: "denied", status: 403, message: WORKSHEET_ERR_ASSIGNMENT_CLOSED };
  }

  const worksheet = parseWorksheetDataFromAssignmentPayload(assignment.quizData);
  if (!worksheet) {
    return { kind: "denied", status: 400, message: WORKSHEET_ERR_NO_WORKSHEET };
  }

  const existing = await db.assignmentSubmission.findUnique({
    where: {
      studentId_assignmentId: { studentId: student.id, assignmentId },
    },
    select: { score: true },
  });
  if (existing && !worksheet.settings.allowResubmit) {
    return { kind: "already_submitted", score: existing.score };
  }

  return {
    kind: "ok",
    studentId: student.id,
    studentCode: student.loginCode,
    assignmentName: assignment.name,
    maxScore: assignment.maxScore,
    worksheet,
    showScoreToStudent: worksheet.settings.showScoreToStudent,
    allowResubmit: worksheet.settings.allowResubmit,
    hasPreviousSubmission: Boolean(existing),
  };
}
