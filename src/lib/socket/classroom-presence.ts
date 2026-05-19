/** In-memory classroom presence: which student roster IDs have at least one live socket in the room. */

type PresenceEntry = {
    classId: string;
    studentId: string | null;
};

const entriesBySocket = new Map<string, PresenceEntry[]>();
const socketsByClassStudent = new Map<string, Map<string, Set<string>>>();

function getClassStudentMap(classId: string) {
    let byStudent = socketsByClassStudent.get(classId);
    if (!byStudent) {
        byStudent = new Map();
        socketsByClassStudent.set(classId, byStudent);
    }
    return byStudent;
}

function addSocketForStudent(classId: string, studentId: string, socketId: string) {
    const byStudent = getClassStudentMap(classId);
    let sockets = byStudent.get(studentId);
    if (!sockets) {
        sockets = new Set();
        byStudent.set(studentId, sockets);
    }
    sockets.add(socketId);
}

function removeSocketForStudent(classId: string, studentId: string, socketId: string) {
    const byStudent = socketsByClassStudent.get(classId);
    const sockets = byStudent?.get(studentId);
    sockets?.delete(socketId);
    if (sockets && sockets.size === 0) {
        byStudent?.delete(studentId);
    }
    if (byStudent && byStudent.size === 0) {
        socketsByClassStudent.delete(classId);
    }
}

export function registerClassroomPresence(
    classId: string,
    socketId: string,
    studentId: string | null
) {
    const entries = entriesBySocket.get(socketId) ?? [];
    const alreadyRegistered = entries.some(
        (entry) => entry.classId === classId && entry.studentId === studentId
    );
    if (alreadyRegistered) {
        return;
    }

    entries.push({ classId, studentId });
    entriesBySocket.set(socketId, entries);

    if (studentId) {
        addSocketForStudent(classId, studentId, socketId);
    }
}

export function unregisterClassroomPresence(classId: string, socketId: string): void {
    const entries = entriesBySocket.get(socketId);
    if (!entries?.length) {
        return;
    }

    const remaining = entries.filter((entry) => {
        if (entry.classId !== classId) {
            return true;
        }

        if (entry.studentId) {
            removeSocketForStudent(entry.classId, entry.studentId, socketId);
        }
        return false;
    });

    if (remaining.length > 0) {
        entriesBySocket.set(socketId, remaining);
    } else {
        entriesBySocket.delete(socketId);
    }
}

export function unregisterAllClassroomSockets(socketId: string): string[] {
    const entries = entriesBySocket.get(socketId);
    if (!entries?.length) {
        return [];
    }

    const affected = new Set<string>();
    for (const entry of entries) {
        affected.add(entry.classId);
        if (entry.studentId) {
            removeSocketForStudent(entry.classId, entry.studentId, socketId);
        }
    }

    entriesBySocket.delete(socketId);
    return [...affected];
}

export function getOnlineStudentIds(classId: string): string[] {
    const byStudent = socketsByClassStudent.get(classId);
    if (!byStudent) {
        return [];
    }

    return [...byStudent.entries()]
        .filter(([, sockets]) => sockets.size > 0)
        .map(([studentId]) => studentId)
        .sort();
}

export function buildPresenceUpdatePayload(classId: string) {
    return {
        type: "PRESENCE_UPDATE" as const,
        data: {
            onlineStudentIds: getOnlineStudentIds(classId),
        },
    };
}

/** Test helper */
export function resetClassroomPresenceForTests() {
    entriesBySocket.clear();
    socketsByClassStudent.clear();
}
