import { PATCH as handle } from "@/app/api/student/[code]/courses/[courseId]/progress/route";
import { withStudentAccess } from "@/lib/auth/student-access-route";
export const PATCH = withStudentAccess(handle, "student:write");
