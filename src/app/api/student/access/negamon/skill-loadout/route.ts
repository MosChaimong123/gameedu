import { PUT as handle } from "@/app/api/student/[code]/negamon/skill-loadout/route";
import { withStudentAccess } from "@/lib/auth/student-access-route";
export const PUT = withStudentAccess(handle, "student:write");
