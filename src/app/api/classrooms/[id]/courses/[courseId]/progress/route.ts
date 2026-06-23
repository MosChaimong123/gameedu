import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE, createAppErrorResponse } from "@/lib/api-error"
import { isCourseContentV1 } from "@/lib/courses/course-content"
import { buildClassroomCourseCurriculumAnalytics } from "@/lib/courses/classroom-course-curriculum-analytics"
import {
    buildClassroomCourseStudentProgress,
    summarizeClassroomCourseProgress,
} from "@/lib/courses/classroom-course-analytics"
import { db } from "@/lib/db"
import { isTeacherOrAdmin } from "@/lib/role-guards"

type Params = { params: Promise<{ id: string; courseId: string }> }

export async function GET(_req: Request, { params }: Params) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        }
        if (!isTeacherOrAdmin(session.user.role)) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        const { id: classId, courseId } = await params
        const classroom = await db.classroom.findUnique({
            where: { id: classId },
            select: { id: true, name: true, teacherId: true },
        })
        if (!classroom) {
            return createAppErrorResponse("NOT_FOUND", "Classroom not found", 404)
        }
        if (classroom.teacherId !== session.user.id && session.user.role !== "ADMIN") {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        const assignment = await db.courseAssignment.findFirst({
            where: {
                classId,
                courseId,
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        subject: true,
                        gradeLevel: true,
                        content: true,
                    },
                },
            },
        })
        if (!assignment || !isCourseContentV1(assignment.course.content)) {
            return createAppErrorResponse("NOT_FOUND", "Course assignment not found", 404)
        }

        const students = await db.student.findMany({
            where: { classId },
            select: {
                id: true,
                name: true,
                nickname: true,
                loginCode: true,
            },
            orderBy: { name: "asc" },
        })

        const studentIds = students.map((student) => student.id)
        const lessonIds = Array.from(new Set(assignment.course.content.modules.flatMap((module) => module.lessons.map((lesson) => lesson.lessonId))))
        const [progressRows, assessmentAttempts, certificates, lessons] = await Promise.all([
            studentIds.length > 0
                ? db.courseProgress.findMany({
                      where: {
                          classId,
                          courseId,
                          studentId: { in: studentIds },
                      },
                      select: {
                          id: true,
                          studentId: true,
                          completedLessonIds: true,
                          currentLessonId: true,
                          percent: true,
                          startedAt: true,
                          lastOpenedAt: true,
                          completedAt: true,
                      },
                  })
                : Promise.resolve([]),
            studentIds.length > 0
                ? db.courseAssessmentAttempt.findMany({
                      where: {
                          classId,
                          courseId,
                          studentId: { in: studentIds },
                          passed: true,
                      },
                      select: {
                          studentId: true,
                          assessmentId: true,
                      },
                  })
                : Promise.resolve([]),
            studentIds.length > 0
                ? db.courseCertificate.findMany({
                      where: {
                          classId,
                          courseId,
                          studentId: { in: studentIds },
                      },
                      select: {
                          studentId: true,
                          issuedAt: true,
                      },
                  })
                : Promise.resolve([]),
            lessonIds.length > 0
                ? db.lesson.findMany({
                      where: { id: { in: lessonIds } },
                      select: {
                          id: true,
                          title: true,
                          subject: true,
                          content: true,
                      },
                  })
                : Promise.resolve([]),
        ])

        const progressByStudentId = new Map(progressRows.map((row) => [row.studentId, row]))
        const passedAssessmentIdsByStudentId = new Map<string, string[]>()
        for (const attempt of assessmentAttempts) {
            const current = passedAssessmentIdsByStudentId.get(attempt.studentId) ?? []
            current.push(attempt.assessmentId)
            passedAssessmentIdsByStudentId.set(attempt.studentId, current)
        }
        const certificateStudentIds = new Set(certificates.map((certificate) => certificate.studentId))

        const courseContent = assignment.course.content

        const studentsProgress = students.map((student) =>
            buildClassroomCourseStudentProgress({
                content: courseContent,
                student,
                progress: progressByStudentId.get(student.id),
                passedAssessmentIds: passedAssessmentIdsByStudentId.get(student.id) ?? [],
                issuedCertificate: certificateStudentIds.has(student.id),
                dueAt: assignment.dueAt,
            })
        )
        const summary = summarizeClassroomCourseProgress(studentsProgress)
        const curriculumAnalytics = buildClassroomCourseCurriculumAnalytics({
            content: courseContent,
            lessons,
            students: studentsProgress.map((student) => ({ completedLessonIds: student.completedLessonIds })),
        })

        return NextResponse.json({
            classroom: {
                id: classroom.id,
                name: classroom.name,
            },
            course: {
                id: assignment.course.id,
                title: assignment.course.title,
                subject: assignment.course.subject,
                gradeLevel: assignment.course.gradeLevel,
            },
            assignment: {
                id: assignment.id,
                assignedAt: assignment.assignedAt,
                startAt: assignment.startAt,
                dueAt: assignment.dueAt,
                status: assignment.status,
            },
            summary,
            curriculumAnalytics,
            students: studentsProgress,
        })
    } catch (error) {
        console.error("[CLASSROOM_COURSE_PROGRESS_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to load classroom course progress", 500)
    }
}
