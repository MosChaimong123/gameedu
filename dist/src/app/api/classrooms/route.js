"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
async function GET(req) {
    const session = await (0, auth_1.auth)();
    if (!session || !session.user || !session.user.id) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const classrooms = await db_1.db.classroom.findMany({
            where: {
                teacherId: session.user.id
            },
            include: {
                _count: {
                    select: { students: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return server_1.NextResponse.json(classrooms);
    }
    catch (error) {
        console.error("[CLASSROOMS_GET]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
async function POST(req) {
    const session = await (0, auth_1.auth)();
    if (!session || !session.user || !session.user.id) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const body = await req.json();
        const { name, grade, image } = body;
        if (!name) {
            return new server_1.NextResponse("Name is required", { status: 400 });
        }
        // Create Classroom
        const classroom = await db_1.db.classroom.create({
            data: {
                name,
                grade,
                image,
                teacherId: session.user.id,
                levelConfig: {
                    'ชาวบ้าน (Villager)': 0,
                    'ทหารฝึกหัด (Militia)': 10,
                    'ผู้พิทักษ์ (Defender)': 20,
                    'อัศวิน (Knight)': 40,
                    'กัปตัน (Captain)': 60,
                    'ฮีโร่ (Hero)': 80,
                    'ตำนาน (Legend)': 100,
                },
                // Add default skills
                skills: {
                    create: [
                        { name: "Helping others", weight: 1, type: "POSITIVE", icon: "help" },
                        { name: "On task", weight: 1, type: "POSITIVE", icon: "task" },
                        { name: "Participating", weight: 1, type: "POSITIVE", icon: "hand" },
                        { name: "Persistence", weight: 1, type: "POSITIVE", icon: "muscle" },
                        { name: "Teamwork", weight: 1, type: "POSITIVE", icon: "team" },
                        { name: "Working hard", weight: 1, type: "POSITIVE", icon: "brain" },
                    ]
                }
            }
        });
        return server_1.NextResponse.json(classroom);
    }
    catch (error) {
        console.error("[CLASSROOMS_POST]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
