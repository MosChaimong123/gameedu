"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canHostQuestionSetForUser = canHostQuestionSetForUser;
exports.canUserAccessClassroom = canUserAccessClassroom;
exports.canUserPublishClassroomSocketEvent = canUserPublishClassroomSocketEvent;
exports.canLoginCodeAccessClassroom = canLoginCodeAccessClassroom;
const student_login_code_1 = require("@/lib/student-login-code");
/** Admin or owner of the question set may host a live game with that set. */
async function canHostQuestionSetForUser(prisma, userId, setId) {
    const [user, questionSet] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        }),
        prisma.questionSet.findUnique({
            where: { id: setId },
            select: { creatorId: true },
        }),
    ]);
    if (!user || !questionSet) {
        return false;
    }
    return user.role === "ADMIN" || questionSet.creatorId === userId;
}
/**
 * Teacher of the class, or a student row linked to this user (`Student.userId`), may access classroom-scoped data over Socket/API.
 */
async function canUserAccessClassroom(prisma, userId, classId) {
    const classroom = await prisma.classroom.findUnique({
        where: { id: classId },
        select: {
            teacherId: true,
            students: {
                where: { userId },
                select: { id: true },
                take: 1,
            },
        },
    });
    if (!classroom) {
        return false;
    }
    return classroom.teacherId === userId || classroom.students.length > 0;
}
/**
 * Who may emit a classroom socket event: teachers always for POINT_UPDATE; BOARD_UPDATE also allowed for linked students.
 */
async function canUserPublishClassroomSocketEvent(prisma, userId, classId, eventType) {
    const classroom = await prisma.classroom.findUnique({
        where: { id: classId },
        select: {
            teacherId: true,
            students: {
                where: { userId },
                select: { id: true },
                take: 1,
            },
        },
    });
    if (!classroom) {
        return false;
    }
    if (eventType === "POINT_UPDATE") {
        return classroom.teacherId === userId;
    }
    return classroom.teacherId === userId || classroom.students.length > 0;
}
/** Student portal: login code must belong to the requested classroom. */
async function canLoginCodeAccessClassroom(prisma, normalizedLoginCode, classId) {
    const student = await prisma.student.findFirst({
        where: {
            OR: (0, student_login_code_1.getStudentLoginCodeVariants)(normalizedLoginCode).map((candidate) => ({ loginCode: candidate })),
        },
        select: { classId: true },
    });
    return (student === null || student === void 0 ? void 0 : student.classId) === classId;
}
