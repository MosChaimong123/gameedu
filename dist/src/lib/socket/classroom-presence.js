"use strict";
/** In-memory classroom presence: which student roster IDs have at least one live socket in the room. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerClassroomPresence = registerClassroomPresence;
exports.unregisterClassroomPresence = unregisterClassroomPresence;
exports.unregisterAllClassroomSockets = unregisterAllClassroomSockets;
exports.getOnlineStudentIds = getOnlineStudentIds;
exports.buildPresenceUpdatePayload = buildPresenceUpdatePayload;
exports.resetClassroomPresenceForTests = resetClassroomPresenceForTests;
const entriesBySocket = new Map();
const socketsByClassStudent = new Map();
function getClassStudentMap(classId) {
    let byStudent = socketsByClassStudent.get(classId);
    if (!byStudent) {
        byStudent = new Map();
        socketsByClassStudent.set(classId, byStudent);
    }
    return byStudent;
}
function addSocketForStudent(classId, studentId, socketId) {
    const byStudent = getClassStudentMap(classId);
    let sockets = byStudent.get(studentId);
    if (!sockets) {
        sockets = new Set();
        byStudent.set(studentId, sockets);
    }
    sockets.add(socketId);
}
function removeSocketForStudent(classId, studentId, socketId) {
    const byStudent = socketsByClassStudent.get(classId);
    const sockets = byStudent === null || byStudent === void 0 ? void 0 : byStudent.get(studentId);
    sockets === null || sockets === void 0 ? void 0 : sockets.delete(socketId);
    if (sockets && sockets.size === 0) {
        byStudent === null || byStudent === void 0 ? void 0 : byStudent.delete(studentId);
    }
    if (byStudent && byStudent.size === 0) {
        socketsByClassStudent.delete(classId);
    }
}
function registerClassroomPresence(classId, socketId, studentId) {
    var _a;
    const entries = (_a = entriesBySocket.get(socketId)) !== null && _a !== void 0 ? _a : [];
    const alreadyRegistered = entries.some((entry) => entry.classId === classId && entry.studentId === studentId);
    if (alreadyRegistered) {
        return;
    }
    entries.push({ classId, studentId });
    entriesBySocket.set(socketId, entries);
    if (studentId) {
        addSocketForStudent(classId, studentId, socketId);
    }
}
function unregisterClassroomPresence(classId, socketId) {
    const entries = entriesBySocket.get(socketId);
    if (!(entries === null || entries === void 0 ? void 0 : entries.length)) {
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
    }
    else {
        entriesBySocket.delete(socketId);
    }
}
function unregisterAllClassroomSockets(socketId) {
    const entries = entriesBySocket.get(socketId);
    if (!(entries === null || entries === void 0 ? void 0 : entries.length)) {
        return [];
    }
    const affected = new Set();
    for (const entry of entries) {
        affected.add(entry.classId);
        if (entry.studentId) {
            removeSocketForStudent(entry.classId, entry.studentId, socketId);
        }
    }
    entriesBySocket.delete(socketId);
    return [...affected];
}
function getOnlineStudentIds(classId) {
    const byStudent = socketsByClassStudent.get(classId);
    if (!byStudent) {
        return [];
    }
    return [...byStudent.entries()]
        .filter(([, sockets]) => sockets.size > 0)
        .map(([studentId]) => studentId)
        .sort();
}
function buildPresenceUpdatePayload(classId) {
    return {
        type: "PRESENCE_UPDATE",
        data: {
            onlineStudentIds: getOnlineStudentIds(classId),
        },
    };
}
/** Test helper */
function resetClassroomPresenceForTests() {
    entriesBySocket.clear();
    socketsByClassStudent.clear();
}
