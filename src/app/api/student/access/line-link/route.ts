import { GET as handle } from "@/app/api/student/[code]/line-link/route";
import { withStudentAccess } from "@/lib/auth/student-access-route";
export const GET = withStudentAccess(handle, "student:write");
