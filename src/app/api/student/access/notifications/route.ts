import { GET as handleGet, PATCH as handlePatch, DELETE as handleDelete } from "@/app/api/student/[code]/notifications/route";
import { withStudentAccess } from "@/lib/auth/student-access-route";
export const GET = withStudentAccess(handleGet);
export const PATCH = withStudentAccess(handlePatch, "student:write");
export const DELETE = withStudentAccess(handleDelete, "student:write");
