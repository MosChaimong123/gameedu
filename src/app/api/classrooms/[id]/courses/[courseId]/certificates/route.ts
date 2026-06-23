import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE, createAppErrorResponse } from "@/lib/api-error"
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
            select: { id: true, teacherId: true, name: true },
        })
        if (!classroom) {
            return createAppErrorResponse("NOT_FOUND", "Classroom not found", 404)
        }
        if (classroom.teacherId !== session.user.id && session.user.role !== "ADMIN") {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        const course = await db.course.findUnique({
            where: { id: courseId },
            select: { id: true, title: true },
        })
        if (!course) {
            return createAppErrorResponse("NOT_FOUND", "Course not found", 404)
        }

        const certificates = await db.courseCertificate.findMany({
            where: {
                classId,
                courseId,
            },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        loginCode: true,
                    },
                },
            },
            orderBy: { issuedAt: "desc" },
        })

        return NextResponse.json({
            classroom: {
                id: classroom.id,
                name: classroom.name,
            },
            course,
            certificates: certificates.map((certificate) => ({
                id: certificate.id,
                title: certificate.title,
                description: certificate.description,
                certificateCode: certificate.certificateCode,
                issuedAt: certificate.issuedAt,
                studentId: certificate.studentId,
                studentName: certificate.student.name,
                studentLoginCode: certificate.student.loginCode,
                rewardSnapshot: certificate.rewardSnapshot,
                criteriaSnapshot: certificate.criteriaSnapshot,
            })),
        })
    } catch (error) {
        console.error("[CLASSROOM_COURSE_CERTIFICATES_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to load course certificates", 500)
    }
}
