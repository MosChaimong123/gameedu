import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server"
import { auth } from "./auth"
import {
    CLASSROOM_GAME_RETIRED_ERROR,
    isClassroomGameSystemEnabled,
    isRetiredClassroomGameRequest,
} from "./lib/classroom-game-system"

type PageProxy = (request: NextRequest, event: NextFetchEvent) => Promise<Response>

export async function proxy(request: NextRequest, event: NextFetchEvent) {
    const pathname = request.nextUrl.pathname
    if (!isClassroomGameSystemEnabled()) {
        if (isRetiredClassroomGameRequest(request.method, pathname)) {
            return NextResponse.json(CLASSROOM_GAME_RETIRED_ERROR, {
                status: 410,
                headers: { "Cache-Control": "no-store" },
            })
        }
        if (/^\/student\/[^/]+\/negamon(?:\/|$)/.test(pathname)) {
            const response = NextResponse.redirect(new URL("/student", request.url))
            response.headers.set("Referrer-Policy", "no-referrer")
            return response
        }
    }

    if (pathname.startsWith("/api/")) return NextResponse.next()
    return (auth as unknown as PageProxy)(request, event)
}

export const config = {
    // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
    matcher: [
        "/api/classrooms/:path*",
        "/api/student/:path*",
        '/((?!api|_next/static|_next/image|socket.io|favicon.ico|.*\\.png$).*)',
    ],
}
