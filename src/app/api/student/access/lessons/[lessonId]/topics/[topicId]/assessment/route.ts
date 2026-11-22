import { GET as handle } from "@/app/api/student/[code]/lessons/[lessonId]/topics/[topicId]/assessment/route";
import { withStudentAccess } from "@/lib/auth/student-access-route";
export const GET = withStudentAccess(handle);
