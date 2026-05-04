type StudentManagerRosterStudent = {
    id: string;
    order: number;
    name: string;
    nickname: string | null;
};

export function sortStudentManagerRoster<T extends { order: number }>(students: T[]) {
    return [...students].sort((a, b) => a.order - b.order);
}

export function updateStudentManagerRosterStudent<T extends StudentManagerRosterStudent>(
    students: T[],
    studentId: string,
    updates: Pick<T, "name" | "nickname">
) {
    return sortStudentManagerRoster(
        students.map((student) =>
            student.id === studentId ? { ...student, ...updates } : student
        )
    );
}

export function removeStudentManagerRosterStudent<T extends { id: string; order: number }>(
    students: T[],
    studentId: string
) {
    return sortStudentManagerRoster(
        students.filter((student) => student.id !== studentId)
    );
}
