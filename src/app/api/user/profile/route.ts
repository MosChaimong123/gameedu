import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function PATCH(req: Request) {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, school } = body;

        if (!name || name.trim().length === 0) {
            return new NextResponse("Name is required", { status: 400 });
        }

        const updatedUser = await db.user.update({
            where: { id: session.user.id },
            data: {
                name: name.trim(),
                school: school?.trim() || null,
            },
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("[USER_PROFILE_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
