"use client";

import { useRef } from "react";
import { saveClassroomAttendance } from "@/lib/classroom-dashboard-actions";
import type { ClassroomDashboardViewModel } from "@/lib/services/classroom-dashboard/get-classroom-dashboard";
import type { DashboardToastFn, DashboardTranslateFn } from "./classroom-dashboard.types";

type UseClassroomAttendanceFlowArgs = {
    classroomId: string;
    students: ClassroomDashboardViewModel["students"];
    setClassroom: React.Dispatch<React.SetStateAction<ClassroomDashboardViewModel>>;
    toast: DashboardToastFn;
    t: DashboardTranslateFn;
};

export function useClassroomAttendanceFlow({
    classroomId,
    students,
    setClassroom,
    toast,
    t,
}: UseClassroomAttendanceFlowArgs) {
    const attendanceSnapshotRef = useRef<ClassroomDashboardViewModel["students"] | null>(null);

    const enterAttendanceMode = () => {
        attendanceSnapshotRef.current = students;
    };

    const cycleStudentAttendance = (studentId: string) => {
        if (!attendanceSnapshotRef.current) {
            attendanceSnapshotRef.current = students;
        }

        const statuses = ["PRESENT", "ABSENT", "LATE", "LEFT_EARLY"];
        setClassroom((prev) => ({
            ...prev,
            students: prev.students.map((student) => {
                if (student.id !== studentId) return student;
                const currentIndex = statuses.indexOf(student.attendance || "PRESENT");
                return {
                    ...student,
                    attendance: statuses[(currentIndex + 1) % statuses.length],
                };
            }),
        }));
    };

    const restoreAttendanceSnapshot = () => {
        if (!attendanceSnapshotRef.current) return;

        setClassroom((prev) => ({
            ...prev,
            students: attendanceSnapshotRef.current ?? prev.students,
        }));
        attendanceSnapshotRef.current = null;
    };

    const saveAttendance = async () => {
        const updates = students.map((student) => ({
            studentId: student.id,
            status: student.attendance || "PRESENT",
        }));

        try {
            await saveClassroomAttendance({
                classroomId,
                updates,
            });
            toast({
                title: t("toastAttendanceSaveSuccessTitle"),
                description: t("toastAttendanceSaveSuccessDesc"),
            });
            attendanceSnapshotRef.current = null;
            return true;
        } catch {
            toast({
                title: t("toastAttendanceSaveFailTitle"),
                description: t("toastAttendanceSaveFailDesc"),
                variant: "destructive",
            });
            return false;
        }
    };

    return {
        enterAttendanceMode,
        cycleStudentAttendance,
        restoreAttendanceSnapshot,
        saveAttendance,
    };
}
