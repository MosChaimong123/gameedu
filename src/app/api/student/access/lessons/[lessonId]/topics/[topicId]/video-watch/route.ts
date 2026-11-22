import { PATCH as handle } from "@/app/api/student/[code]/lessons/[lessonId]/topics/[topicId]/video-watch/route";
import { withStudentAccess } from "@/lib/auth/student-access-route";
export const PATCH = withStudentAccess(handle, "student:write");
