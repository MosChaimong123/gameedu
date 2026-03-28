"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
async function POST(req, { params }) {
    const { id } = await params;
    const session = await (0, auth_1.auth)();
    if (!session || !session.user || !session.user.id) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        // Get the original classroom
        const originalClassroom = await db_1.db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            },
            include: {
                skills: true,
                assignments: true
            }
        });
        if (!originalClassroom) {
            return new server_1.NextResponse("Not Found", { status: 404 });
        }
        // Generate unique name for duplicate
        const timestamp = new Date().toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const newName = `${originalClassroom.name} (Copy - ${timestamp})`;
        // Create new classroom with same settings but no students
        const duplicatedClassroom = await db_1.db.classroom.create({
            data: {
                name: newName,
                teacherId: session.user.id,
                emoji: originalClassroom.emoji,
                theme: originalClassroom.theme,
                grade: originalClassroom.grade,
                gamifiedSettings: originalClassroom.gamifiedSettings,
                levelConfig: originalClassroom.levelConfig,
                // Copy skills
                skills: {
                    create: originalClassroom.skills.map((skill) => ({
                        name: skill.name,
                        type: skill.type,
                        weight: skill.weight,
                        icon: skill.icon
                    }))
                },
                // Copy assignments
                assignments: {
                    create: originalClassroom.assignments.map((assignment) => ({
                        name: assignment.name,
                        description: assignment.description,
                        order: assignment.order
                    }))
                }
            },
            include: {
                skills: true,
                assignments: true
            }
        });
        return server_1.NextResponse.json({
            success: true,
            classroom: duplicatedClassroom
        });
    }
    catch (error) {
        console.error("[CLASSROOM_DUPLICATE]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
