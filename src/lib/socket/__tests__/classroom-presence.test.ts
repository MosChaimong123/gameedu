import { afterEach, describe, expect, it } from "vitest";
import {
    buildPresenceUpdatePayload,
    getOnlineStudentIds,
    registerClassroomPresence,
    resetClassroomPresenceForTests,
    unregisterAllClassroomSockets,
    unregisterClassroomPresence,
} from "../classroom-presence";

describe("classroom-presence", () => {
    afterEach(() => {
        resetClassroomPresenceForTests();
    });

    it("tracks online students per classroom", () => {
        registerClassroomPresence("class-1", "socket-a", "student-1");
        registerClassroomPresence("class-1", "socket-b", "student-2");

        expect(getOnlineStudentIds("class-1")).toEqual(["student-1", "student-2"]);
    });

    it("keeps a student online while any socket remains", () => {
        registerClassroomPresence("class-1", "socket-a", "student-1");
        registerClassroomPresence("class-1", "socket-b", "student-1");

        unregisterClassroomPresence("class-1", "socket-a");
        expect(getOnlineStudentIds("class-1")).toEqual(["student-1"]);

        unregisterClassroomPresence("class-1", "socket-b");
        expect(getOnlineStudentIds("class-1")).toEqual([]);
    });

    it("ignores teacher sockets without a student id", () => {
        registerClassroomPresence("class-1", "socket-teacher", null);
        registerClassroomPresence("class-1", "socket-student", "student-1");

        expect(buildPresenceUpdatePayload("class-1")).toEqual({
            type: "PRESENCE_UPDATE",
            data: { onlineStudentIds: ["student-1"] },
        });
    });

    it("cleans up all classroom memberships for a disconnecting socket", () => {
        registerClassroomPresence("class-1", "socket-1", "student-1");
        registerClassroomPresence("class-2", "socket-1", "student-9");

        expect(unregisterAllClassroomSockets("socket-1").sort()).toEqual(["class-1", "class-2"]);
        expect(getOnlineStudentIds("class-1")).toEqual([]);
        expect(getOnlineStudentIds("class-2")).toEqual([]);
    });
});
