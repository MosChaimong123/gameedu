import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { QuizClient } from "@/components/student/quiz-client";
import { getThemeBgStyle } from "@/lib/classroom-utils";
import { resolveQuizReviewMode } from "@/lib/quiz-review-policy";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";

export default async function QuizPage(props: {
    params: Promise<{ code: string; assignmentId: string }>
}) {
    const { code, assignmentId } = await props.params;

    const student = await db.student.findFirst({
        where: {
            OR: getStudentLoginCodeVariants(code).map((candidate) => ({ loginCode: candidate })),
        },
        select: {
            id: true,
            loginCode: true,
            classroom: {
                select: {
                    id: true,
                    theme: true,
                    quizReviewMode: true,
                    assignments: {
                        where: { id: assignmentId, type: "quiz", visible: true },
                        select: {
                            id: true,
                            name: true,
                            maxScore: true,
                            quizData: true,
                            deadline: true,
                            description: true,
                            quizReviewMode: true,
                        }
                    }
                }
            },
            submissions: {
                where: { assignmentId },
                select: { id: true, score: true }
            }
        }
    });

    if (!student) return notFound();

    const assignment = student.classroom.assignments[0];
    if (!assignment || !assignment.quizData) return notFound();
    if (assignment.deadline && new Date(assignment.deadline) < new Date()) return notFound();

    // Already submitted → redirect back
    if (student.submissions.length > 0) {
        redirect(`/student/${code}`);
    }

    const quizData = assignment.quizData as { questions?: unknown[] };
    if (!Array.isArray(quizData.questions) || quizData.questions.length === 0) {
        return notFound();
    }

    const theme = student.classroom.theme || "from-indigo-500 to-purple-600";
    const isCustomTheme = theme.startsWith("custom:");
    const themeStyle = isCustomTheme ? getThemeBgStyle(theme) : {};
    const themeClass = isCustomTheme ? "" : `bg-gradient-to-r ${theme}`;
    const reviewMode = resolveQuizReviewMode({
        assignmentMode: assignment.quizReviewMode,
        classroomMode: student.classroom.quizReviewMode,
    });

    return (
        <QuizClient
            assignment={{
                id: assignment.id,
                name: assignment.name,
                maxScore: assignment.maxScore,
                description: assignment.description?.trim() || undefined,
            }}
            classId={student.classroom.id}
            studentCode={student.loginCode}
            themeClass={themeClass}
            themeStyle={themeStyle}
            reviewMode={reviewMode}
        />
    );
}
