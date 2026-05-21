"use client";

import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";

type ClassroomPresencePayload = {
    type: string;
    data?: {
        onlineStudentIds?: string[];
    };
};

type UseClassroomPresenceArgs = {
    classroomId: string;
    socket: Socket | null;
    isConnected: boolean;
    studentId?: string | null;
    studentCode?: string | null;
    /** When false, the socket stays in the classroom room until disconnect (for parent dashboards). */
    leaveOnUnmount?: boolean;
};

export function useClassroomPresence({
    classroomId,
    socket,
    isConnected,
    studentId,
    studentCode,
    leaveOnUnmount = true,
}: UseClassroomPresenceArgs) {
    const [onlineStudentIds, setOnlineStudentIds] = useState<Set<string>>(() => new Set());

    useEffect(() => {
        if (!socket || !isConnected || !classroomId) {
            return;
        }

        const handleClassroomEvent = (payload: ClassroomPresencePayload) => {
            if (payload.type !== "PRESENCE_UPDATE") {
                return;
            }

            const ids = payload.data?.onlineStudentIds;
            if (!Array.isArray(ids)) {
                return;
            }

            setOnlineStudentIds(new Set(ids.filter((id) => typeof id === "string" && id.length > 0)));
        };

        socket.on("classroom-event", handleClassroomEvent);
        socket.emit("join-classroom", {
            classId: classroomId,
            studentId: studentId ?? undefined,
            studentCode: studentCode ?? undefined,
        });

        return () => {
            socket.off("classroom-event", handleClassroomEvent);
            if (leaveOnUnmount) {
                socket.emit("leave-classroom", classroomId);
            }
        };
    }, [socket, isConnected, classroomId, studentId, studentCode, leaveOnUnmount]);

    return onlineStudentIds;
}
