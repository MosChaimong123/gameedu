/** Canonical attendance codes stored on Student.attendance and AttendanceRecord.status */
export const ATTENDANCE_STATUSES = [
    "PRESENT",
    "ABSENT",
    "LATE",
    "LEFT_EARLY",
    "SICK",
    "LEAVE",
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_CHART_COLORS: Record<AttendanceStatus, string> = {
    PRESENT: "#22c55e",
    ABSENT: "#ef4444",
    LATE: "#f59e0b",
    LEFT_EARLY: "#f97316",
    SICK: "#a855f7",
    LEAVE: "#3b82f6",
};

export function isAttendanceStatus(value: string): value is AttendanceStatus {
    return (ATTENDANCE_STATUSES as readonly string[]).includes(value);
}

export function normalizeAttendanceStatus(value: string | null | undefined): AttendanceStatus {
    if (value && isAttendanceStatus(value)) {
        return value;
    }
    return "PRESENT";
}

export function cycleAttendanceStatus(current: string | null | undefined): AttendanceStatus {
    const normalized = normalizeAttendanceStatus(current);
    const index = ATTENDANCE_STATUSES.indexOf(normalized);
    return ATTENDANCE_STATUSES[(index + 1) % ATTENDANCE_STATUSES.length];
}

export function attendanceLabelKey(status: string): string {
    switch (status) {
        case "PRESENT":
            return "present";
        case "ABSENT":
            return "absent";
        case "LATE":
            return "late";
        case "LEFT_EARLY":
            return "leftEarly";
        case "SICK":
            return "attendanceSick";
        case "LEAVE":
            return "attendanceLeave";
        default:
            return "absent";
    }
}

/** Students not physically in class — dim avatar and hide point badges */
export function attendanceDimmed(status: string): boolean {
    return status === "ABSENT" || status === "SICK" || status === "LEAVE";
}

export function attendanceHistorySelectClass(status: string): string {
    switch (status) {
        case "PRESENT":
            return "bg-green-100 text-green-700 border-green-200";
        case "LATE":
            return "bg-yellow-100 text-yellow-700 border-yellow-200";
        case "ABSENT":
            return "bg-red-100 text-red-700 border-red-200";
        case "LEFT_EARLY":
            return "bg-orange-100 text-orange-700 border-orange-200";
        case "SICK":
            return "bg-purple-100 text-purple-700 border-purple-200";
        case "LEAVE":
            return "bg-blue-100 text-blue-700 border-blue-200";
        default:
            return "bg-slate-100 text-slate-700 border-slate-200";
    }
}

export function attendanceTableBorderClass(status: string): string {
    if (status === "LATE") return "border-2 border-yellow-400";
    if (status === "LEFT_EARLY") return "border-2 border-orange-400";
    if (status === "SICK") return "border-2 border-purple-400";
    if (status === "LEAVE") return "border-2 border-blue-400";
    return "";
}

export function attendanceTableDimClass(status: string): string {
    if (status === "ABSENT") return "opacity-50 grayscale";
    if (status === "SICK") return "opacity-60 grayscale-[0.6]";
    if (status === "LEAVE") return "opacity-60";
    return "";
}

export function attendanceBadgeClass(status: string): string {
    switch (status) {
        case "ABSENT":
            return "bg-red-500";
        case "LATE":
            return "bg-yellow-500";
        case "LEFT_EARLY":
            return "bg-orange-500";
        case "SICK":
            return "bg-purple-500";
        case "LEAVE":
            return "bg-blue-500";
        default:
            return "bg-slate-500";
    }
}

export function attendanceAnalyticsPillClass(status: string): string {
    switch (status) {
        case "PRESENT":
            return "bg-emerald-50 text-emerald-700 border-emerald-200";
        case "LATE":
            return "bg-yellow-50 text-yellow-700 border-yellow-200";
        case "ABSENT":
            return "bg-red-50 text-red-700 border-red-200";
        case "LEFT_EARLY":
            return "bg-orange-50 text-orange-700 border-orange-200";
        case "SICK":
            return "bg-purple-50 text-purple-700 border-purple-200";
        case "LEAVE":
            return "bg-blue-50 text-blue-700 border-blue-200";
        default:
            return "bg-slate-50 text-slate-700 border-slate-200";
    }
}

export function attendanceAvatarRingClass(status: string): string {
    if (status === "LATE") return "ring-4 ring-yellow-400 ring-offset-2";
    if (status === "LEFT_EARLY") return "ring-4 ring-orange-400 ring-offset-2";
    if (status === "SICK") return "ring-4 ring-purple-400 ring-offset-2";
    if (status === "LEAVE") return "ring-4 ring-blue-400 ring-offset-2";
    return "";
}

export function attendanceOverlayClass(status: string): string | undefined {
    if (status === "ABSENT") return "bg-red-500/10";
    if (status === "SICK") return "bg-purple-500/10";
    if (status === "LEAVE") return "bg-blue-500/10";
    return undefined;
}

export function attendanceNameStrikeClass(status: string): string {
    if (status === "ABSENT" || status === "SICK" || status === "LEAVE") {
        return "text-slate-400 line-through";
    }
    return "";
}

export function attendanceNameStrikeDecorationClass(status: string): string {
    if (status === "ABSENT" || status === "SICK" || status === "LEAVE") {
        return "text-slate-400 line-through decoration-red-400/50";
    }
    return "";
}

export function emptyAttendanceSummary(): Record<AttendanceStatus, number> {
    return {
        PRESENT: 0,
        ABSENT: 0,
        LATE: 0,
        LEFT_EARLY: 0,
        SICK: 0,
        LEAVE: 0,
    };
}
