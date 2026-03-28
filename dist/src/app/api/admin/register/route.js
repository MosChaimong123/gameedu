"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function POST(req) {
    try {
        const { email, password, adminSecret } = await req.json();
        if (!email || !password || !adminSecret) {
            return new server_1.NextResponse("Missing credentials", { status: 400 });
        }
        // Validate the admin secret
        const validSecret = process.env.ADMIN_SECRET;
        if (!validSecret || adminSecret !== validSecret) {
            return new server_1.NextResponse("Invalid admin secret", { status: 403 });
        }
        // Find or create admin user
        const existing = await db_1.db.user.findUnique({ where: { email } });
        if (!existing) {
            // Create a new admin user
            const hashedPassword = await bcryptjs_1.default.hash(password, 12);
            // Generate a unique username for admin
            const usernameSuffix = Math.floor(1000 + Math.random() * 9000);
            const adminUsername = `admin_${usernameSuffix}`;
            const newUser = await db_1.db.user.create({
                data: {
                    email,
                    username: adminUsername,
                    password: hashedPassword,
                    role: "ADMIN",
                    name: "Admin",
                }
            });
            return server_1.NextResponse.json({ message: "Admin account created", userId: newUser.id, username: adminUsername });
        }
        // If user exists, upgrade to ADMIN
        if (existing.role === "ADMIN") {
            return server_1.NextResponse.json({ message: "Already an admin" });
        }
        // Validate password before upgrading
        if (!existing.password) {
            return new server_1.NextResponse("Account uses OAuth. Cannot upgrade via this method.", { status: 400 });
        }
        const isValid = await bcryptjs_1.default.compare(password, existing.password);
        if (!isValid) {
            return new server_1.NextResponse("Invalid credentials", { status: 403 });
        }
        // Upgrade existing user to ADMIN
        await db_1.db.user.update({
            where: { email },
            data: { role: "ADMIN" }
        });
        return server_1.NextResponse.json({ message: "User upgraded to Admin" });
    }
    catch (error) {
        console.error("[ADMIN_REGISTER_POST]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
