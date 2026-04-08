import { NextResponse } from "next/server"
import { requireSessionUser } from "@/lib/auth-guards"
import { AUTH_REQUIRED_MESSAGE } from "@/lib/api-error";

export async function POST(req: Request) {
    try {
        const user = await requireSessionUser()
        if (!user?.id) {
            return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 })
        }

        await req.json().catch(() => null)
        return new NextResponse("Direct plan upgrades are disabled", { status: 403 })
    } catch (error) {
        console.error("[UPGRADE_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
