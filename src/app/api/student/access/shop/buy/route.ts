import { POST as handle } from "@/app/api/student/[code]/shop/buy/route";
import { withStudentAccess } from "@/lib/auth/student-access-route";
export const POST = withStudentAccess(handle, "student:write");
