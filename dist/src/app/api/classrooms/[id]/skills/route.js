"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
async function GET(req, { params }) {
    const { id } = await params;
    const session = await (0, auth_1.auth)();
    if (!session || !session.user) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const skills = await db_1.db.skill.findMany({
            where: {
                classId: id,
                classroom: {
                    teacherId: session.user.id
                }
            }
        });
        return server_1.NextResponse.json(skills);
    }
    catch (error) {
        console.error("[SKILLS_GET]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
async function POST(req, { params }) {
    const { id } = await params;
    const session = await (0, auth_1.auth)();
    if (!session || !session.user) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const body = await req.json();
        const { name, weight, type, icon } = body;
        if (!name || weight === undefined || !type || !icon) {
            return new server_1.NextResponse("Missing required fields", { status: 400 });
        }
        const classroom = await db_1.db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            }
        });
        if (!classroom) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const skill = await db_1.db.skill.create({
            data: {
                name,
                weight: Number(weight),
                type,
                icon,
                classId: id
            }
        });
        return server_1.NextResponse.json(skill);
    }
    catch (error) {
        console.error("[SKILL_POST]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
