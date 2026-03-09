import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const { email, password, adminSecret } = await req.json();

        if (!email || !password || !adminSecret) {
            return new NextResponse("Missing credentials", { status: 400 });
        }

        // Validate the admin secret
        const validSecret = process.env.ADMIN_SECRET;
        if (!validSecret || adminSecret !== validSecret) {
            return new NextResponse("Invalid admin secret", { status: 403 });
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
            return NextResponse.json({ message: "Admin account created", userId: newUser.id, username: adminUsername });
        }

        // If user exists, upgrade to ADMIN
        if (existing.role === "ADMIN") {
            return NextResponse.json({ message: "Already an admin" });
        }

        // Validate password before upgrading
        if (!existing.password) {
            return new NextResponse("Account uses OAuth. Cannot upgrade via this method.", { status: 400 });
        }

        const isValid = await bcrypt.compare(password, existing.password);
        if (!isValid) {
            return new NextResponse("Invalid credentials", { status: 403 });
        }

        // Upgrade existing user to ADMIN
        await db.user.update({
            where: { email },
            data: { role: "ADMIN" }
        });

        return NextResponse.json({ message: "User upgraded to Admin" });
    } catch (error) {
        console.error("[ADMIN_REGISTER_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
