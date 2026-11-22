import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { newPasswordSchema } from "@/lib/auth/password-policy";
import { validateNewPassword } from "@/lib/auth/password-policy-server";
import { hashPassword, verifyPassword } from "@/lib/auth/password-hash";
import { changeUserRole } from "@/lib/auth/security-mutations";

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as {
            email?: unknown;
            password?: unknown;
            adminSecret?: unknown;
        };
        const email =
            typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = typeof body.password === "string" ? body.password : "";
        const adminSecret =
            typeof body.adminSecret === "string" ? body.adminSecret : undefined;

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
                return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
            }

            const validSecret = process.env.ADMIN_SECRET;
            if (!adminSecret || !validSecret || adminSecret !== validSecret) {
                return createAppErrorResponse("FORBIDDEN", "Invalid admin secret", 403);
            }
        }

        // Find or create admin user
        const existing = await db.user.findUnique({ where: { email } });

        if (!existing) {
            if (!newPasswordSchema.safeParse(password).success || !(await validateNewPassword(password)).valid) {
                return createAppErrorResponse("PASSWORD_POLICY_VIOLATION", "Password does not meet security policy", 400);
            }
            // Create a new admin user
            const hashedPassword = await hashPassword(password);
            const verifiedAt = new Date();

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
                    emailVerified: verifiedAt,
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

        const isValid = await verifyPassword(password, existing.password);
        if (!isValid) {
            return createAppErrorResponse("FORBIDDEN", "Invalid credentials", 403);
        }

        // Upgrade existing user to ADMIN (ensure they can sign in with credentials)
        await changeUserRole(existing.id, "ADMIN");
        if (!existing.emailVerified) {
            await db.user.update({ where: { id: existing.id }, data: { emailVerified: new Date() } });
        }

        return NextResponse.json({ ok: true, result: "USER_UPGRADED_TO_ADMIN" });
    } catch (error) {
        console.error("[ADMIN_REGISTER_POST]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
