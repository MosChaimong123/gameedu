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

export function moveStudentManagerRosterStudent<T extends { id: string; order: number }>(
    students: T[],
    studentId: string,
    direction: "up" | "down"
) {
    const sorted = sortStudentManagerRoster(students);
    const currentIndex = sorted.findIndex((student) => student.id === studentId);

    if (currentIndex === -1) {
        return sorted;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) {
        return sorted;
    }

    const reordered = [...sorted];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    return reordered.map((student, index) => ({
        ...student,
        order: index,
    }));
}

export async function commitStudentManagerRosterOrder<T extends { id: string; order: number }>(
    previousStudents: T[],
    reorderedStudents: T[],
    persist: (students: T[]) => Promise<void>
) {
    try {
        await persist(reorderedStudents);
        return {
            committed: true as const,
            nextStudents: reorderedStudents,
            error: null,
        };
    } catch (error) {
        return {
            committed: false as const,
            nextStudents: previousStudents,
            error,
        };
    }
}
