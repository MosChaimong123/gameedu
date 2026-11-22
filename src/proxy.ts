import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import {
  CLASSROOM_GAME_RETIRED_ERROR,
  isClassroomGameSystemEnabled,
  isRetiredClassroomGameRequest,
} from "./lib/classroom-game-system";

const SAFE_STUDENT_SEGMENTS = new Set(["access", "home"]);

function applyStudentCodeBoundary(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);

  if (
    !isClassroomGameSystemEnabled() &&
    isRetiredClassroomGameRequest(request.method, request.nextUrl.pathname)
  ) {
    return NextResponse.json(CLASSROOM_GAME_RETIRED_ERROR, {
      status: 410,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (segments[0] === "api" && segments[1] === "student") {
    if (segments[2] && segments[2] !== "access") {
      return NextResponse.json(
        { error: { code: "STUDENT_CODE_EXCHANGE_REQUIRED", message: "Use a student access session" } },
        { status: 410, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } }
      );
    }
    return NextResponse.next();
  }

  if (segments[0] === "student" && segments[1]) {
    const first = segments[1].toLowerCase();
    if (!SAFE_STUDENT_SEGMENTS.has(first) && segments.length > 2) {
      return NextResponse.redirect(new URL("/student", request.url));
    }
    const response = NextResponse.next();
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  return NextResponse.next();
}

type AuthenticatedProxyHandler = (
  request: NextRequest,
  event?: NextFetchEvent
) => Promise<Response>;

// Lazy Auth.js initialization makes auth(callback) resolve to a handler.
// Next.js requires the exported proxy itself to be synchronously callable.
const authenticatedStudentBoundary = auth(
  (request) => applyStudentCodeBoundary(request)
) as unknown as Promise<AuthenticatedProxyHandler>;

export async function proxy(request: NextRequest, event?: NextFetchEvent) {
  const handler = await authenticatedStudentBoundary;
  return handler(request, event);
}

export const config = {
  matcher: [
    "/api/student/:path*",
    "/api/classrooms/:path*",
    "/((?!api|_next/static|_next/image|socket.io|favicon.ico|.*\\.png$).*)",
  ],
};
