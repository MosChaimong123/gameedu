import { db, getOptionalDbModel } from "@/lib/db";
import { isLineTeacherAuthorizedForGroup } from "@/lib/line-bot/teacher-linking";

type TeacherLinkModel = {
    findUnique(input: {
        where: { lineUserId: string };
        select: { userId: true };
    }): Promise<{ userId: string } | null>;
};

export type LineActor =
    | { kind: "public"; lineUserId: string }
    | {
          kind: "student";
          lineUserId: string;
          links: Array<{ userId: string; studentId: string; classroomId: string }>;
      }
    | { kind: "teacher"; lineUserId: string; userId: string };

export async function resolveLineActor(lineUserId: string): Promise<LineActor> {
    const teacherModel =
        getOptionalDbModel<TeacherLinkModel>("lineTeacherAccountLink");
    const [teacherLink, studentLinks] = await Promise.all([
        teacherModel?.findUnique({
            where: { lineUserId },
            select: { userId: true },
        }) ?? Promise.resolve(null),
        db.lineStudentAccountLink.findMany({
            where: { lineUserId },
            select: { userId: true, studentId: true, classroomId: true },
        }),
    ]);
    if (teacherLink) {
        return { kind: "teacher", lineUserId, userId: teacherLink.userId };
    }
    if (studentLinks.length > 0) {
        return { kind: "student", lineUserId, links: studentLinks };
    }
    return { kind: "public", lineUserId };
}

export async function authorizeLineCapability(input: {
    actor: LineActor;
    capability:
        | "line.assignment.create"
        | "line.student.bind"
        | "line.classroom.bind";
    lineGroupId: string;
}): Promise<boolean> {
    if (input.actor.kind !== "teacher") return false;
    return isLineTeacherAuthorizedForGroup({
        lineUserId: input.actor.lineUserId,
        lineGroupId: input.lineGroupId,
    });
}
