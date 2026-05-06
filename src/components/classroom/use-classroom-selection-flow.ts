"use client";

import { useEffect, useMemo, useState } from "react";
import type { SavedGroupSummary } from "./toolkit/group-maker";

type SavedGroupApiRecord = {
    id: string;
    name: string;
    studentIds: string[];
};

export function parseSavedGroupStudentIds(studentIds: string[]): string[] {
    return studentIds.flatMap((raw) => {
        try {
            const parsed = JSON.parse(raw) as { studentIds?: string[] } | string[];
            return Array.isArray(parsed) ? parsed : (parsed.studentIds ?? []);
        } catch {
            return raw ? [raw] : [];
        }
    });
}

export function parseSavedGroupRecord(group: SavedGroupApiRecord): SavedGroupSummary {
    const ids = parseSavedGroupStudentIds(group.studentIds);

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

export function resolveActiveGroupFilter(
    groupFilter: string,
    savedGroups: SavedGroupSummary[]
): string {
    if (groupFilter === "all") {
        return groupFilter;
    }

    return savedGroups.some((group) => group.id === groupFilter) ? groupFilter : "all";
}

export function useClassroomSelectionFlow(args: {
    classroomId: string;
    studentIds: string[];
}) {
    const { classroomId, studentIds } = args;
    const [isSelectMultiple, setIsSelectMultiple] = useState(false);
    const [rawSelectedStudentIds, setRawSelectedStudentIds] = useState<string[]>([]);
    const [rawGroupFilter, setRawGroupFilter] = useState<string>("all");
    const [rawSavedGroups, setRawSavedGroups] = useState<SavedGroupSummary[]>([]);

    useEffect(() => {
        if (!isSelectMultiple || rawSavedGroups.length > 0) return;

        fetch(`/api/classrooms/${classroomId}/groups`)
            .then((response) => (response.ok ? response.json() : []))
            .then((groups: SavedGroupApiRecord[]) => {
                setRawSavedGroups(groups.map(parseSavedGroupRecord));
            })
            .catch(() => {});
    }, [isSelectMultiple, classroomId, rawSavedGroups.length]);

    const savedGroups = useMemo(
        () => normalizeSavedGroupsForRoster(rawSavedGroups, studentIds),
        [rawSavedGroups, studentIds]
    );
    const selectedStudentIds = useMemo(
        () => filterSelectedStudentIdsForRoster(rawSelectedStudentIds, studentIds),
        [rawSelectedStudentIds, studentIds]
    );
    const groupFilter = useMemo(
        () => resolveActiveGroupFilter(rawGroupFilter, savedGroups),
        [rawGroupFilter, savedGroups]
    );

    const visibleStudentIds = useMemo(() => (
        groupFilter === "all"
            ? studentIds
            : (savedGroups.find((group) => group.id === groupFilter)?.studentIds ?? [])
    ), [groupFilter, savedGroups, studentIds]);

    const setSelectedStudentIds = (value: string[] | ((prev: string[]) => string[])) => {
        setRawSelectedStudentIds((prev) => {
            const next = typeof value === "function"
                ? (value as (previous: string[]) => string[])(filterSelectedStudentIdsForRoster(prev, studentIds))
                : value;

            return filterSelectedStudentIdsForRoster(next, studentIds);
        });
    };

    const setGroupFilter = (value: string | ((prev: string) => string)) => {
        setRawGroupFilter((prev) => (
            typeof value === "function" ? value(resolveActiveGroupFilter(prev, savedGroups)) : value
        ));
    };

    const setSavedGroups = (value: SavedGroupSummary[] | ((prev: SavedGroupSummary[]) => SavedGroupSummary[])) => {
        setRawSavedGroups((prev) => {
            const normalizedPrev = normalizeSavedGroupsForRoster(prev, studentIds);
            const next = typeof value === "function" ? value(normalizedPrev) : value;
            return normalizeSavedGroupsForRoster(next, studentIds);
        });
    };

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
