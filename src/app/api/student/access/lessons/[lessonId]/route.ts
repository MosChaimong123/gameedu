import { GET as handle } from "@/app/api/student/[code]/lessons/[lessonId]/route";
import { withStudentAccess } from "@/lib/auth/student-access-route";
export const GET = withStudentAccess(handle);
