
export type StudentDueWorkInput = {
    id: string;
    name: string;
    deadlineAt: Date | null;
    deadlineValid: boolean;
    isCompleted: boolean;
    isQuiz: boolean;
    isWorksheet: boolean;
};

export type StudentDueWorkItem = StudentDueWorkInput & {
    isOverdue: boolean;
    isDueToday: boolean;
    isDueSoon: boolean;
};

function isSameLocalDay(a: Date, b: Date) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

export function getStudentDueWork(
    items: StudentDueWorkInput[],
    now = new Date(),
    limit = 3
): StudentDueWorkItem[] {
    const soonHorizon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    return items
        .filter((item) => item.deadlineValid && item.deadlineAt !== null && !item.isCompleted)
        .map((item) => {
            const deadlineAt = item.deadlineAt!;
            return {
                ...item,
                isOverdue: deadlineAt < now,
                isDueToday: isSameLocalDay(deadlineAt, now),
                isDueSoon: deadlineAt >= now && deadlineAt <= soonHorizon,
            };
        })
        .filter((item) => item.isOverdue || item.isDueToday || item.isDueSoon)
        .sort((a, b) => {
            const ao = a.isOverdue ? 0 : 1;
            const bo = b.isOverdue ? 0 : 1;
            if (ao !== bo) return ao - bo;
            return a.deadlineAt!.getTime() - b.deadlineAt!.getTime();
        })
        .slice(0, limit);
}
