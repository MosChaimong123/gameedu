"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const auth_1 = require("@/auth");
// GET /api/classroom/[id]/events — get all events (students + teacher)
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
        const events = settings.events || [];
        const now = new Date();
        // Mark which events are currently active
        const withActive = events.map((e) => ({
            ...e,
            active: new Date(e.startAt) <= now && new Date(e.endAt) >= now
        }));
        return server_1.NextResponse.json(withActive);
    }
    catch (error) {
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
// POST /api/classroom/[id]/events — create event (teacher only)
async function POST(req, { params }) {
    try {
        const session = await (0, auth_1.auth)();
        if (!(session === null || session === void 0 ? void 0 : session.user))
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await params;
        const { title, description, icon, type, multiplier, startAt, endAt } = await req.json();
        if (!(title === null || title === void 0 ? void 0 : title.trim()) || !startAt || !endAt) {
            return server_1.NextResponse.json({ error: "title, startAt, endAt are required" }, { status: 400 });
        }
        const classroom = await db_1.db.classroom.findUnique({
            where: { id },
            select: { gamifiedSettings: true }
        });
        if (!classroom)
            return server_1.NextResponse.json({ error: "Not found" }, { status: 404 });
        const settings = classroom.gamifiedSettings || {};
        const existing = settings.events || [];
        const newEvent = {
            id: `event_${Date.now()}`,
            title: title.trim(),
            description: (description === null || description === void 0 ? void 0 : description.trim()) || "",
            icon: icon || "⚡",
            type: type || "CUSTOM",
            multiplier: Number(multiplier) || 1,
            startAt,
            endAt,
            active: false,
        };
        await db_1.db.classroom.update({
            where: { id },
            data: {
                gamifiedSettings: {
                    ...settings,
                    events: [...existing, newEvent]
                }
            }
        });
        return server_1.NextResponse.json({ success: true, event: newEvent });
    }
    catch (error) {
        console.error("Error creating event:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
// DELETE /api/classroom/[id]/events — delete event (teacher only)
async function DELETE(req, { params }) {
    try {
        const session = await (0, auth_1.auth)();
        if (!(session === null || session === void 0 ? void 0 : session.user))
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await params;
        const { eventId } = await req.json();
        const classroom = await db_1.db.classroom.findUnique({
            where: { id },
            select: { gamifiedSettings: true }
        });
        if (!classroom)
            return server_1.NextResponse.json({ error: "Not found" }, { status: 404 });
        const settings = classroom.gamifiedSettings || {};
        const updated = (settings.events || []).filter((e) => e.id !== eventId);
        await db_1.db.classroom.update({
            where: { id },
            data: { gamifiedSettings: { ...settings, events: updated } }
        });
        return server_1.NextResponse.json({ success: true });
    }
    catch (error) {
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
