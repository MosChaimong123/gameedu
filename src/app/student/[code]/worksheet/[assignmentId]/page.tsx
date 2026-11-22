import { notFound, redirect } from "next/navigation";
import { getThemeBgStyle } from "@/lib/classroom-utils";
import { sanitizeWorksheetForStudent } from "@/lib/worksheet-schema";
import { loadWorksheetTakeContext } from "@/lib/worksheet-take-context";
import { WorksheetClient } from "@/components/student/worksheet-client";
import { db } from "@/lib/db";
import { getStudentAccessSession, STUDENT_ACCESS_ROUTE_KEY } from "@/lib/auth/student-access-session";

export default async function WorksheetPage(props: {
  params: Promise<{ code: string; assignmentId: string }>;
}) {
  const { code, assignmentId } = await props.params;
  if (code !== STUDENT_ACCESS_ROUTE_KEY) redirect("/student");
  const accessSession = await getStudentAccessSession();
  if (!accessSession) redirect("/student?error=session_expired");

  const student = await db.student.findFirst({
    where: {
      id: accessSession.studentId,
    },
    select: {
      loginCode: true,
      classroom: {
        select: {
          id: true,
          theme: true,
        },
      },
    },
  });

  if (!student) return notFound();

  const ctx = await loadWorksheetTakeContext(student.classroom.id, assignmentId, accessSession.student.loginCode);
  if (ctx.kind === "already_submitted") {
    redirect("/student/access");
  }
  if (ctx.kind !== "ok") {
    return notFound();
  }

  const worksheet = sanitizeWorksheetForStudent(ctx.worksheet);
  const theme = student.classroom.theme || "from-fuchsia-500 to-pink-500";
  const isCustomTheme = theme.startsWith("custom:");
  const themeStyle = isCustomTheme ? getThemeBgStyle(theme) : {};
  const themeClass = isCustomTheme ? "" : `bg-gradient-to-r ${theme}`;

  return (
    <WorksheetClient
      assignment={{
        id: assignmentId,
        name: ctx.assignmentName,
        maxScore: ctx.maxScore,
        description: ctx.assignmentDescription,
        mediaReferences: ctx.mediaReferences,
      }}
      classId={student.classroom.id}
      studentCode={STUDENT_ACCESS_ROUTE_KEY}
      themeClass={themeClass}
      themeStyle={themeStyle}
      showScoreToStudent={ctx.showScoreToStudent}
      allowResubmit={ctx.allowResubmit}
      hasPreviousSubmission={ctx.hasPreviousSubmission}
      pages={worksheet.pages}
    />
  );
}
