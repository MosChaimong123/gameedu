"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const auth_1 = require("@/auth");
// GET /api/classroom/[id]/custom-achievements — list all custom achievements for a classroom
async function GET(req, { params }) {
    try {
        const { id } = await params;
        const classroom = await db_1.db.classroom.findUnique({
            where: { id },
            select: { gamifiedSettings: true }
        });
        if (!classroom)
            return server_1.NextResponse.json({ error: "Not found" }, { status: 404 });
        const settings = classroom.gamifiedSettings || {};
        return server_1.NextResponse.json(settings.customAchievements || []);
    }
    catch (error) {
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
// POST /api/classroom/[id]/custom-achievements — create a new custom achievement
async function POST(req, { params }) {
    try {
        const session = await (0, auth_1.auth)();
        if (!(session === null || session === void 0 ? void 0 : session.user))
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await params;
        const { name, description, icon, goldReward } = await req.json();
        if (!(name === null || name === void 0 ? void 0 : name.trim()))
            return server_1.NextResponse.json({ error: "Name is required" }, { status: 400 });
        const classroom = await db_1.db.classroom.findUnique({
            where: { id },
            select: { gamifiedSettings: true }
        });
        if (!classroom)
            return server_1.NextResponse.json({ error: "Not found" }, { status: 404 });
        const settings = classroom.gamifiedSettings || {};
        const existing = settings.customAchievements || [];
        const newAchievement = {
            id: `custom_${Date.now()}`,
            name: name.trim(),
            description: (description === null || description === void 0 ? void 0 : description.trim()) || "",
            icon: icon || "🌟",
            goldReward: Number(goldReward) || 100,
            createdAt: new Date().toISOString(),
        };
        await db_1.db.classroom.update({
            where: { id },
            data: {
                gamifiedSettings: {
                    ...settings,
                    customAchievements: [...existing, newAchievement]
                }
            }
        });
        return server_1.NextResponse.json({ success: true, achievement: newAchievement });
    }
    catch (error) {
        console.error("Error creating custom achievement:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
// DELETE /api/classroom/[id]/custom-achievements — delete a custom achievement
async function DELETE(req, { params }) {
    try {
        const session = await (0, auth_1.auth)();
        if (!(session === null || session === void 0 ? void 0 : session.user))
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await params;
        const { achievementId } = await req.json();
        const classroom = await db_1.db.classroom.findUnique({
            where: { id },
            select: { gamifiedSettings: true }
        });
        if (!classroom)
            return server_1.NextResponse.json({ error: "Not found" }, { status: 404 });
        const settings = classroom.gamifiedSettings || {};
        const updated = (settings.customAchievements || []).filter((a) => a.id !== achievementId);
        await db_1.db.classroom.update({
            where: { id },
            data: { gamifiedSettings: { ...settings, customAchievements: updated } }
        });
        return server_1.NextResponse.json({ success: true });
    }
    catch (error) {
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
