export type LineReminderType = "before_1d" | "due_today" | "overdue_1d" | "weekly_summary";

export type ClassroomLineReminderSettingSnapshot = {
    classroomId: string;
    enabled: boolean;
    beforeDeadline1d: boolean;
    dueToday: boolean;
    overdue1d: boolean;
    weeklySummary: boolean;
};

export const DEFAULT_CLASSROOM_LINE_REMINDER_SETTING: ClassroomLineReminderSettingSnapshot = {
    classroomId: "",
    enabled: false,
    beforeDeadline1d: true,
    dueToday: true,
    overdue1d: true,
    weeklySummary: false,
};

export function normalizeClassroomLineReminderSetting(
    classroomId: string,
    row?: Partial<ClassroomLineReminderSettingSnapshot> | null
): ClassroomLineReminderSettingSnapshot {
    return {
        classroomId,
        enabled: Boolean(row?.enabled ?? DEFAULT_CLASSROOM_LINE_REMINDER_SETTING.enabled),
        beforeDeadline1d: Boolean(
            row?.beforeDeadline1d ?? DEFAULT_CLASSROOM_LINE_REMINDER_SETTING.beforeDeadline1d
        ),
        dueToday: Boolean(row?.dueToday ?? DEFAULT_CLASSROOM_LINE_REMINDER_SETTING.dueToday),
        overdue1d: Boolean(row?.overdue1d ?? DEFAULT_CLASSROOM_LINE_REMINDER_SETTING.overdue1d),
        weeklySummary: Boolean(row?.weeklySummary ?? DEFAULT_CLASSROOM_LINE_REMINDER_SETTING.weeklySummary),
    };
}

export function isLineReminderTypeEnabled(
    setting: ClassroomLineReminderSettingSnapshot,
    reminderType: LineReminderType
): boolean {
    if (!setting.enabled) return false;
    if (reminderType === "before_1d") return setting.beforeDeadline1d;
    if (reminderType === "due_today") return setting.dueToday;
    if (reminderType === "overdue_1d") return setting.overdue1d;
    return setting.weeklySummary;
}
