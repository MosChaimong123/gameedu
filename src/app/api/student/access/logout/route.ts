import { NextResponse } from "next/server";
import {
  revokeCurrentStudentAccessSession,
  STUDENT_ACCESS_COOKIE,
} from "@/lib/auth/student-access-session";

export async function POST() {
  await revokeCurrentStudentAccessSession();
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(STUDENT_ACCESS_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
