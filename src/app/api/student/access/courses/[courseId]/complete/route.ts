import { POST as handle } from "@/app/api/student/[code]/courses/[courseId]/complete/route";
import { withStudentAccess } from "@/lib/auth/student-access-route";
export const POST = withStudentAccess(handle, "student:write");
