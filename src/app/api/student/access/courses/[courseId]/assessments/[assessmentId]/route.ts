import { GET as handle } from "@/app/api/student/[code]/courses/[courseId]/assessments/[assessmentId]/route";
import { withStudentAccess } from "@/lib/auth/student-access-route";
export const GET = withStudentAccess(handle);
