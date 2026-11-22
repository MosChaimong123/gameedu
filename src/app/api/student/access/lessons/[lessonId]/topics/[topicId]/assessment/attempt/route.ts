import { POST as handle } from "@/app/api/student/[code]/lessons/[lessonId]/topics/[topicId]/assessment/attempt/route";
import { withStudentAccess } from "@/lib/auth/student-access-route";
export const POST = withStudentAccess(handle, "student:write");
