import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getThemeBgStyle, getRankEntry } from "@/lib/classroom-utils";
import { StudentDashboardClient } from "@/components/student/StudentDashboardClient";

export default async function StudentDashboardPage(
    props: { params: Promise<{ code: string }> }
) {
    const { code } = await props.params;
    const session = await auth();
    const currentUserId = session?.user?.id;

    const student = await db.student.findUnique({
        where: { loginCode: code.toUpperCase() },
        include: {
            classroom: {
                select: {
                    id: true,
                    name: true,
                    image: true,
                    emoji: true,
                    theme: true,
                    levelConfig: true,
                    gamifiedSettings: true,
                    teacher: { select: { name: true } },
                    assignments: {
                        orderBy: { order: 'asc' },
                        select: { id: true, name: true, description: true, type: true, maxScore: true, passScore: true, deadline: true, checklists: true, visible: true }
                    }
                }
            },
            items: {
                where: { isEquipped: true },
                include: { item: true }
            },
            history: { orderBy: { timestamp: 'desc' }, take: 30 },
            submissions: { select: { assignmentId: true, score: true, submittedAt: true } }
        }
    });

    if (!student) return notFound();

    // Cast to any to bypass Prisma's temporary linting issues after schema changes
    const sObj = student as any;
    const classroom = sObj.classroom;
    const history = sObj.history;
    const submissions = sObj.submissions;
    
    // Helper: calculate total score from bitmask and checklist items with points
    const calculateChecklistScore = (bitmask: number, checklistItems: any[]) => {
        if (!Array.isArray(checklistItems)) return 0;
        return checklistItems.reduce((sum, item, i) => {
            const isChecked = (bitmask & (1 << i)) !== 0;
            const points = typeof item === 'object' ? (item.points || 0) : 1;
            return isChecked ? sum + points : sum;
        }, 0);
    };

    const submissionMap = new Map(submissions.map((s: any) => [s.assignmentId, s]));
    const academicTotal = sObj.classroom.assignments.reduce((sum: number, assignment: any) => {
        const submission = submissionMap.get(assignment.id) as any;
        if (!submission) return sum;
        if (assignment.type === 'checklist') {
            return sum + calculateChecklistScore(submission.score, assignment.checklists);
        }
        return sum + submission.score;
    }, 0);
    
    // Rank is now calculated ONLY from academic points
    const rankEntry = getRankEntry(academicTotal, classroom.levelConfig);

    const theme = classroom.theme || "from-indigo-500 to-purple-600";
    const isCustomTheme = theme.startsWith("custom:");
    const themeStyle = isCustomTheme ? getThemeBgStyle(theme) : {};
    const themeClass = isCustomTheme ? "" : `bg-gradient-to-br ${theme}`;

    const classIcon = classroom.emoji;
    const isImageIcon = classIcon?.startsWith('data:image') || classIcon?.startsWith('http');

    const totalPositive = history.filter((h: any) => h.value > 0).reduce((s: number, h: any) => s + h.value, 0);
    const totalNegative = Math.abs(history.filter((h: any) => h.value < 0).reduce((s: number, h: any) => s + h.value, 0));

    return (
        <StudentDashboardClient 
            student={student}
            classroom={classroom}
            history={history}
            submissions={submissions}
            academicTotal={academicTotal}
            totalPositive={totalPositive}
            totalNegative={totalNegative}
            rankEntry={rankEntry}
            themeClass={themeClass}
            themeStyle={themeStyle}
            classIcon={classIcon}
            isImageIcon={isImageIcon}
            currentUserId={currentUserId}
            code={code}
        />
    );
}
