"use client";

import { useEffect, useMemo, useState } from "react";
import type { SavedGroupSummary } from "./toolkit/group-maker";

type SavedGroupApiRecord = {
    id: string;
    name: string;
    studentIds: string[];
};

function parseSavedGroupRecord(group: SavedGroupApiRecord): SavedGroupSummary {
    const ids = group.studentIds.flatMap((raw) => {
        try {
            const parsed = JSON.parse(raw) as { studentIds?: string[] } | string[];
            return Array.isArray(parsed) ? parsed : (parsed.studentIds ?? []);
        } catch {
            return [];
        }
    });

    return {
        id: group.id,
        name: group.name,
        studentIds: ids,
    };
}

export function normalizeSavedGroupsForRoster(
    savedGroups: SavedGroupSummary[],
    studentIds: string[]
): SavedGroupSummary[] {
    const allowedStudentIds = new Set(studentIds);

    return savedGroups
        .map((group) => ({
            ...group,
            studentIds: group.studentIds.filter((studentId) => allowedStudentIds.has(studentId)),
        }))
        .filter((group) => group.studentIds.length > 0);
}

export function filterSelectedStudentIdsForRoster(
    selectedStudentIds: string[],
    studentIds: string[]
): string[] {
    const allowedStudentIds = new Set(studentIds);
    const next = selectedStudentIds.filter((studentId) => allowedStudentIds.has(studentId));
    const unchanged =
        next.length === selectedStudentIds.length &&
        next.every((studentId, index) => studentId === selectedStudentIds[index]);

    return unchanged ? selectedStudentIds : next;
}

export function useClassroomSelectionFlow(args: {
    classroomId: string;
    studentIds: string[];
}) {
    const { classroomId, studentIds } = args;
    const [isSelectMultiple, setIsSelectMultiple] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [groupFilter, setGroupFilter] = useState<string>("all");
    const [savedGroups, setSavedGroups] = useState<SavedGroupSummary[]>([]);
    const studentIdsKey = useMemo(() => studentIds.join("|"), [studentIds]);

    useEffect(() => {
        if (!isSelectMultiple || savedGroups.length > 0) return;

        fetch(`/api/classrooms/${classroomId}/groups`)
            .then((response) => (response.ok ? response.json() : []))
            .then((groups: SavedGroupApiRecord[]) => {
                setSavedGroups(groups.map(parseSavedGroupRecord));
            })
            .catch(() => {});
    }, [isSelectMultiple, classroomId, savedGroups.length]);

    useEffect(() => {
        setSavedGroups((prev) => {
            const next = normalizeSavedGroupsForRoster(prev, studentIds);
            const unchanged =
                next.length === prev.length &&
                next.every((group, index) =>
                    group.id === prev[index]?.id &&
                    group.name === prev[index]?.name &&
                    group.studentIds.length === prev[index]?.studentIds.length &&
                    group.studentIds.every((studentId, studentIndex) => studentId === prev[index]?.studentIds[studentIndex])
                );

            return unchanged ? prev : next;
        });

        setSelectedStudentIds((prev) => filterSelectedStudentIdsForRoster(prev, studentIds));
    }, [studentIds, studentIdsKey]);

    useEffect(() => {
        if (groupFilter === "all") return;
        if (savedGroups.some((group) => group.id === groupFilter)) return;
        setGroupFilter("all");
    }, [groupFilter, savedGroups]);

    const visibleStudentIds = useMemo(() => (
        groupFilter === "all"
            ? studentIds
            : (savedGroups.find((group) => group.id === groupFilter)?.studentIds ?? [])
    ), [groupFilter, savedGroups, studentIds]);

    const toggleStudentSelection = (studentId: string) => {
        setSelectedStudentIds((prev) =>
            prev.includes(studentId)
                ? prev.filter((id) => id !== studentId)
                : [...prev, studentId]
        );
    };

    const clearSelectionMode = () => {
        setIsSelectMultiple(false);
        setSelectedStudentIds([]);
        setGroupFilter("all");
    };

    return {
        isSelectMultiple,
        setIsSelectMultiple,
        selectedStudentIds,
        setSelectedStudentIds,
        groupFilter,
        setGroupFilter,
        savedGroups,
        setSavedGroups,
        visibleStudentIds,
        toggleStudentSelection,
        clearSelectionMode,
    };
}
