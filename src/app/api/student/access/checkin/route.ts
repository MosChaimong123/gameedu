import { POST as handle } from "@/app/api/student/[code]/checkin/route";
import { withStudentAccess } from "@/lib/auth/student-access-route";
export const POST = withStudentAccess(handle, "student:write");
