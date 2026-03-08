import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { QuizClient } from "@/components/student/quiz-client";
import { getThemeBgStyle } from "@/lib/classroom-utils";

export default async function QuizPage(props: {
    params: Promise<{ code: string; assignmentId: string }>
}) {
    const { code, assignmentId } = await props.params;

    const student = await db.student.findUnique({
        where: { loginCode: code.toUpperCase() },
        select: {
            id: true,
            loginCode: true,
            classroom: {
                select: {
                    id: true,
                    theme: true,
                    assignments: {
                        where: { id: assignmentId, type: "quiz", visible: true },
                        select: { id: true, name: true, maxScore: true, quizData: true }
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

    // Already submitted → redirect back
    if (student.submissions.length > 0) {
        redirect(`/student/${code}`);
    }

    const quizData = assignment.quizData as {
        questions: {
            id: string;
            question: string;
            options: string[];
            correctAnswer: number;
        }[]
    };

    const theme = student.classroom.theme || "from-indigo-500 to-purple-600";
    const isCustomTheme = theme.startsWith("custom:");
    const themeStyle = isCustomTheme ? getThemeBgStyle(theme) : {};
    const themeClass = isCustomTheme ? "" : `bg-gradient-to-r ${theme}`;

    return (
        <QuizClient
            assignment={{ id: assignment.id, name: assignment.name, maxScore: assignment.maxScore }}
            questions={quizData.questions}
            classId={student.classroom.id}
            studentCode={student.loginCode}
            themeClass={themeClass}
            themeStyle={themeStyle}
        />
    );
}
