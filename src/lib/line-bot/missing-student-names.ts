import { getOptionalDbModel } from "@/lib/db";
import { getLineGroupMemberDisplayName } from "@/lib/line-bot/client";

export type MissingStudentName = {
    /** LINE display name when linked and available, otherwise the system name. */
    name: string;
    linked: boolean;
};

type BindingRow = {
    id: string;
    studentId: string;
    lineUserId: string;
    lineDisplayName: string | null;
};

type BindingQueryModel = {
    findMany(input: {
        where: { classroomId: string };
        select: { id: true; studentId: true; lineUserId: true; lineDisplayName: true };
    }): Promise<BindingRow[]>;
    update(input: { where: { id: string }; data: { lineDisplayName: string } }): Promise<unknown>;
};

/**
 * Builds a resolver that maps students to the name we should show in LINE reminders:
 * the linked LINE display name when available, otherwise the student's system name.
 *
 * Bindings are loaded once and reused across assignments. When a student is linked but
 * we have not stored their display name yet, it is fetched from LINE and backfilled into
 * the binding so subsequent reminders are fast. All LINE/DB calls fail soft.
 */
export async function createMissingStudentNameResolver(input: {
    lineGroupId: string;
    classroomId: string;
}): Promise<(students: Array<{ id: string; name: string }>) => Promise<MissingStudentName[]>> {
    const bindingModel = getOptionalDbModel<BindingQueryModel>("lineStudentBinding");
    const bindings = bindingModel
        ? await bindingModel
              .findMany({
                  where: { classroomId: input.classroomId },
                  select: { id: true, studentId: true, lineUserId: true, lineDisplayName: true },
              })
              .catch(() => [] as BindingRow[])
        : [];

    const byStudent = new Map(bindings.map((binding) => [binding.studentId, binding]));
    const resolvedCache = new Map<string, string>();

    return async function resolve(
        students: Array<{ id: string; name: string }>
    ): Promise<MissingStudentName[]> {
        const result: MissingStudentName[] = [];
        for (const student of students) {
            const binding = byStudent.get(student.id);
            if (!binding) {
                result.push({ name: student.name, linked: false });
                continue;
            }

            let displayName = resolvedCache.get(student.id) ?? binding.lineDisplayName?.trim() ?? "";
            if (!displayName) {
                displayName = (await getLineGroupMemberDisplayName(input.lineGroupId, binding.lineUserId)) ?? "";
                if (displayName && bindingModel) {
                    await bindingModel
                        .update({ where: { id: binding.id }, data: { lineDisplayName: displayName } })
                        .catch(() => {});
                }
            }
            if (displayName) resolvedCache.set(student.id, displayName);

            result.push({ name: displayName || student.name, linked: true });
        }
        return result;
    };
}
