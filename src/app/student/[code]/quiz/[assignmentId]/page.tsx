import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { QuizClient } from "@/components/student/quiz-client";
import { getThemeBgStyle } from "@/lib/classroom-utils";
import { resolveQuizReviewMode } from "@/lib/quiz-review-policy";
import { isQuizSubmissionCompleted } from "@/lib/quiz-attempt";
import { normalizeTeachingMediaReferences } from "@/lib/teaching-media-reference";
import { getStudentAccessSession, STUDENT_ACCESS_ROUTE_KEY } from "@/lib/auth/student-access-session";

export default async function QuizPage(props: {
    params: Promise<{ code: string; assignmentId: string }>
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
                            timeLimitMinutes: true,
                            description: true,
                            mediaReferences: true,
                            quizReviewMode: true,
                        }
                    }
                }
            },
            submissions: {
                where: { assignmentId },
                select: {
                    id: true,
                    score: true,
                    attemptStartedAt: true,
                    quizCompletedAt: true,
                },
            }
        }
    });

    if (!student) return notFound();

    const assignment = student.classroom.assignments[0];
    if (!assignment || !assignment.quizData) return notFound();
    if (assignment.deadline && new Date(assignment.deadline) < new Date()) return notFound();

    const submission = student.submissions[0];
    if (submission && isQuizSubmissionCompleted(submission)) {
        redirect("/student/access");
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
                mediaReferences: normalizeTeachingMediaReferences(assignment.mediaReferences),
            }}
            classId={student.classroom.id}
            studentCode={STUDENT_ACCESS_ROUTE_KEY}
            themeClass={themeClass}
            themeStyle={themeStyle}
            reviewMode={reviewMode}
            timeLimitMinutes={assignment.timeLimitMinutes}
        />
    );
}
