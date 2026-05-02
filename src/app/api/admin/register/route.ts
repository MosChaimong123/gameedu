import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { AUTH_REQUIRED_MESSAGE, createAppErrorResponse } from "@/lib/api-error";

export async function POST(req: Request) {
    try {
        const { email, password, adminSecret } = await req.json();

        if (!email || !password) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Missing credentials", 400);
        }

        const session = await auth();
        const isAdminSession = session?.user?.role === "ADMIN";

        if (!isAdminSession) {
            const adminCount = await db.user.count({
                where: { role: "ADMIN" },
            });

            if (adminCount > 0) {
                return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 403 });
            }

            const validSecret = process.env.ADMIN_SECRET;
            if (!adminSecret || !validSecret || adminSecret !== validSecret) {
                return createAppErrorResponse("FORBIDDEN", "Invalid admin secret", 403);
            }
        }

        // Find or create admin user
        const existing = await db.user.findUnique({ where: { email } });

        if (!existing) {
            // Create a new admin user
            const hashedPassword = await bcrypt.hash(password, 12);
            
            // Generate a unique username for admin
            const usernameSuffix = Math.floor(1000 + Math.random() * 9000);
            const adminUsername = `admin_${usernameSuffix}`;

            const newUser = await db.user.create({
                data: {
                    email,
                    username: adminUsername,
                    password: hashedPassword,
                    role: "ADMIN",
                    name: "Admin",
                }
            });
            return NextResponse.json({ ok: true, result: "ADMIN_CREATED", userId: newUser.id, username: adminUsername });
        }

        // If user exists, upgrade to ADMIN
        if (existing.role === "ADMIN") {
            return NextResponse.json({ ok: true, result: "ALREADY_ADMIN" });
        }

        // Validate password before upgrading
        if (!existing.password) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Account uses OAuth. Cannot upgrade via this method.", 400);
        }

        const isValid = await bcrypt.compare(password, existing.password);
        if (!isValid) {
            return createAppErrorResponse("FORBIDDEN", "Invalid credentials", 403);
        }

        // Upgrade existing user to ADMIN
        await db.user.update({
            where: { email },
            data: { role: "ADMIN" }
        });

        return NextResponse.json({ ok: true, result: "USER_UPGRADED_TO_ADMIN" });
    } catch (error) {
        console.error("[ADMIN_REGISTER_POST]", error);
        return createAppErrorResponse("INTERNAL_ERROR", "Internal Error", 500);
    }
}
