import { notFound, redirect } from "next/navigation";
import { getThemeBgStyle } from "@/lib/classroom-utils";
import { sanitizeWorksheetForStudent } from "@/lib/worksheet-schema";
import { loadWorksheetTakeContext } from "@/lib/worksheet-take-context";
import { WorksheetClient } from "@/components/student/worksheet-client";
import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";

export default async function WorksheetPage(props: {
  params: Promise<{ code: string; assignmentId: string }>;
}) {
  const { code, assignmentId } = await props.params;

  const student = await db.student.findFirst({
    where: {
      OR: getStudentLoginCodeVariants(code).map((candidate) => ({ loginCode: candidate })),
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

  const ctx = await loadWorksheetTakeContext(student.classroom.id, assignmentId, code);
  if (ctx.kind === "already_submitted") {
    redirect(`/student/${code}`);
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
      }}
      classId={student.classroom.id}
      studentCode={student.loginCode}
      themeClass={themeClass}
      themeStyle={themeStyle}
      showScoreToStudent={ctx.showScoreToStudent}
      pages={worksheet.pages}
    />
  );
}
