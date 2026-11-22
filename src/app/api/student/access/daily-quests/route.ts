import { GET as handleGet, POST as handlePost } from "@/app/api/student/[code]/daily-quests/route";
import { withStudentAccess } from "@/lib/auth/student-access-route";
export const GET = withStudentAccess(handleGet);
export const POST = withStudentAccess(handlePost, "student:write");
