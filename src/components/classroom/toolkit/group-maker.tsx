"use client";

import { useEffect, useState } from "react";
import { Student, StudentGroup, Skill } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { X, Users, RefreshCw, Heart, Star, Zap, ThumbsUp, Brain, Trophy, AlertCircle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

// Map icon strings to Lucide components
const iconMap: Record<string, any> = {
    "heart": Heart,
    "star": Star,
    "zap": Zap,
    "hand": ThumbsUp,
    "brain": Brain,
    "trophy": Trophy,
    "muscle": Zap,
    "help": Heart,
    "task": Star,
    "team": Trophy,
    "default": Star
};

interface GroupMakerProps {
    students: Student[];
    skills: Skill[];
    onClose: () => void;
    levelConfig?: any;
}

export function GroupMaker({ students, skills, onClose, levelConfig }: GroupMakerProps) {
    const { t } = useLanguage();
    const [groupCount, setGroupCount] = useState(4);
    const [groups, setGroups] = useState<Student[][]>([]);
    const [groupSetName, setGroupSetName] = useState(`Group Set ${new Date().toLocaleDateString()}`);
    const [groupNames, setGroupNames] = useState<string[]>([]);
    const [savedGroups, setSavedGroups] = useState<StudentGroup[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [viewMode, setViewMode] = useState<"generated" | "saved">("generated");
    const [selectedGroupForFeedback, setSelectedGroupForFeedback] = useState<{name: string, studentIds: string[]} | null>(null);
    const [isAwarding, setIsAwarding] = useState(false);
    const [hasSaved, setHasSaved] = useState(false);

    // Edit Saved Group state
    const [editingSavedGroupId, setEditingSavedGroupId] = useState<string | null>(null);
    const [editSavedGroupSetName, setEditSavedGroupSetName] = useState("");
    const [editSavedGroupNames, setEditSavedGroupNames] = useState<string[]>([]);

    // Drag and Drop state
    const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);
    const [draggedFromGroupIndex, setDraggedFromGroupIndex] = useState<number | null>(null);
    const [dragOverGroupIndex, setDragOverGroupIndex] = useState<number | null>(null);
    
    // Fetch saved groups
    useEffect(() => {
        if (!students.length) return;
        const classId = students[0].classId;
        
        const fetchData = async () => {
            try {
                const groupsRes = await fetch(`/api/classrooms/${classId}/groups`);
                if (groupsRes.ok) {
                    const data = await groupsRes.json();
                    setSavedGroups(data);
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
            }
        };
        fetchData();
    }, [students]);

    const handleSaveGroups = async () => {
        if (groups.length === 0 || !students.length) return;
        const classId = students[0].classId;
        
        setIsSaving(true);
        try {
            const formattedGroups = groups.map((g, i) => ({
                name: groupNames[i] || `Group ${i + 1}`,
                studentIds: g.map(s => s.id)
            }));

            const res = await fetch(`/api/classrooms/${classId}/groups`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: groupSetName,
                    groups: formattedGroups
                })
            });
            
            if (res.ok) {
                const newGroups = await res.json();
                setSavedGroups(prev => [...newGroups, ...prev]);
                setHasSaved(true);
                setViewMode("saved");
            }
        } catch (error) {
            console.error("Save error:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSavedGroup = async (groupId: string) => {
        if (!students.length) return;
        const classId = students[0].classId;
        
        try {
            await fetch(`/api/classrooms/${classId}/groups/${groupId}`, { method: "DELETE" });
            setSavedGroups(prev => prev.filter(g => g.id !== groupId));
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    const startEditingSavedGroup = (groupSet: StudentGroup) => {
        setEditingSavedGroupId(groupSet.id);
        setEditSavedGroupSetName(groupSet.name);
        
        const isFirstItemValidString = groupSet.studentIds.length > 0 && typeof groupSet.studentIds[0] === 'string';
        const isOldFormat = isFirstItemValidString && !groupSet.studentIds[0].startsWith('[') && !groupSet.studentIds[0].startsWith('{');
        
        const names = groupSet.studentIds.map((groupStr, index) => {
            if (isOldFormat) return `Group 1`; // Old format didn't have multi groups conceptually in the same way, but it parsed as one
            try {
                const parsed = JSON.parse(groupStr);
                if (!Array.isArray(parsed) && parsed && parsed.studentIds) {
                    return parsed.name || `Group ${index + 1}`;
                }
            } catch (e) {}
            return `Group ${index + 1}`;
        });
        setEditSavedGroupNames(names);
    };

    const handleSaveEditedGroup = async (groupSet: StudentGroup) => {
        if (!students.length) return;
        const classId = students[0].classId;
        
        setIsSaving(true);
        try {
            const isFirstItemValidString = groupSet.studentIds.length > 0 && typeof groupSet.studentIds[0] === 'string';
            const isOldFormat = isFirstItemValidString && !groupSet.studentIds[0].startsWith('[') && !groupSet.studentIds[0].startsWith('{');
            
            let newStudentIds = [...groupSet.studentIds];
            
            if (!isOldFormat) {
                newStudentIds = groupSet.studentIds.map((groupStr, idx) => {
                    try {
                        let parsedGroup = JSON.parse(groupStr);
                        if (Array.isArray(parsedGroup)) {
                            return JSON.stringify({ name: editSavedGroupNames[idx] || `Group ${idx + 1}`, studentIds: parsedGroup });
                        } else if (parsedGroup && parsedGroup.studentIds) {
                            return JSON.stringify({ ...parsedGroup, name: editSavedGroupNames[idx] || `Group ${idx + 1}` });
                        }
                    } catch (e) {}
                    return groupStr;
                });
            }

            const res = await fetch(`/api/classrooms/${classId}/groups/${groupSet.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editSavedGroupSetName,
                    studentIds: newStudentIds
                })
            });

            if (res.ok) {
                const updatedGroup = await res.json();
                setSavedGroups(prev => prev.map(g => g.id === groupSet.id ? updatedGroup : g));
                setEditingSavedGroupId(null);
            }
        } catch (error) {
            console.error("Update error:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAwardGroupPoints = async (skillId: string) => {
        if (!selectedGroupForFeedback || !students.length) return;
        const classId = students[0].classId;
        
        setIsAwarding(true);
        try {
            const studentIds = selectedGroupForFeedback.studentIds;
            
            await fetch(`/api/classrooms/${classId}/points/batch`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentIds: studentIds,
                    skillId: skillId
                })
            });
            
            setSelectedGroupForFeedback(null);
        } catch (error) {
            console.error("Batch points error:", error);
        } finally {
            setIsAwarding(false);
        }
    };

    const createGroups = () => {
        if (students.length === 0) return;

        // Shuffle
        const shuffled = [...students].sort(() => Math.random() - 0.5);

        // Distribute
        const newGroups: Student[][] = Array.from({ length: groupCount }, () => []);

        shuffled.forEach((student, index) => {
            const groupIndex = index % groupCount;
            newGroups[groupIndex].push(student);
        });

        setGroups(newGroups);
        setGroupNames(Array.from({ length: groupCount }, (_, i) => `Group ${i + 1}`));
        setHasSaved(false);
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, studentId: string, fromGroupIndex: number) => {
        setDraggedStudentId(studentId);
        setDraggedFromGroupIndex(fromGroupIndex);
        e.dataTransfer.effectAllowed = 'move';
        // Hide default drag image or keep it default, setting a slight transparency to the original element
        setTimeout(() => {
            if (e.target instanceof HTMLElement) {
                e.target.style.opacity = '0.5';
            }
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedStudentId(null);
        setDraggedFromGroupIndex(null);
        setDragOverGroupIndex(null);
        if (e.target instanceof HTMLElement) {
            e.target.style.opacity = '1';
        }
    };

    const handleDragOver = (e: React.DragEvent, groupIndex: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverGroupIndex !== groupIndex) {
            setDragOverGroupIndex(groupIndex);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOverGroupIndex(null);
    };

    const handleDrop = (e: React.DragEvent, toGroupIndex: number) => {
        e.preventDefault();
        setDragOverGroupIndex(null);
        
        if (!draggedStudentId || draggedFromGroupIndex === null || draggedFromGroupIndex === toGroupIndex) {
            return;
        }

        const newGroups = [...groups];
        // 1. Find and remove from origin group
        const studentIndex = newGroups[draggedFromGroupIndex].findIndex(s => s.id === draggedStudentId);
        if (studentIndex === -1) return;
        
        const [studentToMove] = newGroups[draggedFromGroupIndex].splice(studentIndex, 1);
        
        // 2. Add to target group
        newGroups[toGroupIndex].push(studentToMove);
        
        setGroups(newGroups);
        setHasSaved(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-4xl h-[80vh] flex flex-col relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="text-center mb-6 shrink-0 mt-2">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
                        <Users className="w-6 h-6 text-indigo-500" />
                        {t("groupMaker")}
                    </h2>
                    <p className="text-slate-500 mt-1.5 text-sm md:text-base">Divide {students.length} students into groups</p>
                </div>

                <div className="flex justify-center mb-6 border-b border-slate-100">
                    <button 
                        onClick={() => setViewMode("generated")}
                        className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${viewMode === "generated" ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                    >
                        {t("groupMaker")}
                    </button>
                    <button 
                        onClick={() => setViewMode("saved")}
                        className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${viewMode === "saved" ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                    >
                        {t("savedGroups")}
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{savedGroups.length}</span>
                    </button>
                </div>

                {viewMode === "generated" && (
                    <>
                    {/* Controls */}
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mb-6 p-4 md:p-5 bg-slate-50 rounded-2xl border border-slate-100 shrink-0">
                    <div className="flex items-center gap-4">
                        <Label>{t("numberOfGroups", { count: groupCount })}</Label>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline" size="icon" className="h-8 w-8"
                                onClick={() => setGroupCount(Math.max(2, groupCount - 1))}
                            >
                                -
                            </Button>
                            <span className="w-8 text-center font-bold text-lg">{groupCount}</span>
                            <Button
                                variant="outline" size="icon" className="h-8 w-8"
                                onClick={() => setGroupCount(Math.min(students.length, groupCount + 1))}
                            >
                                +
                            </Button>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={createGroups} size="lg" className="px-8 w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm">
                            {groups.length > 0 ? <><RefreshCw className="w-4 h-4 mr-2" /> Reshuffle</> : t("createGroups")}
                        </Button>
                    </div>
                </div>

                {/* Groups Display */}
                <div className="flex-1 overflow-y-auto px-2 pb-4 min-h-[50%] flex flex-col">
                    {groups.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <Users className="w-12 h-12 mb-4 opacity-20" />
                            <p>Select number of groups and click Create</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {groups.map((group, groupIndex) => (
                                <div 
                                    key={groupIndex} 
                                    className={`bg-slate-50 rounded-2xl p-4 shadow-sm transition-all border-2
                                        ${dragOverGroupIndex === groupIndex ? 'border-indigo-400 bg-indigo-50/50 scale-[1.02]' : 'border-slate-200'}
                                    `}
                                    onDragOver={(e) => handleDragOver(e, groupIndex)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, groupIndex)}
                                >
                                    <div className="flex items-center justify-between gap-3 mb-4 border-b border-slate-200 pb-3">
                                        <Input
                                            value={groupNames[groupIndex] || `Group ${groupIndex + 1}`}
                                            onChange={(e) => {
                                                const newNames = [...groupNames];
                                                newNames[groupIndex] = e.target.value;
                                                setGroupNames(newNames);
                                            }}
                                            className="font-bold text-slate-700 text-lg border-transparent hover:border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 h-9 px-2 shadow-none transition-all rounded-lg w-full"
                                            placeholder={`Group ${groupIndex + 1}`}
                                        />
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full transition-colors shrink-0
                                            ${dragOverGroupIndex === groupIndex ? 'bg-indigo-200 text-indigo-800' : 'bg-indigo-100 text-indigo-700'}
                                        `}>
                                            {group.length} members
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-2.5 min-h-[60px]">
                                        {group.map(student => (
                                            <div 
                                                key={student.id} 
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, student.id, groupIndex)}
                                                onDragEnd={handleDragEnd}
                                                className={`flex items-center gap-3 bg-white p-2 pr-4 rounded-xl border border-slate-100 shadow-sm w-full transition-all cursor-grab active:cursor-grabbing
                                                    ${draggedStudentId === student.id ? 'opacity-50 ring-2 ring-indigo-400 shadow-md' : 'hover:border-indigo-200 hover:shadow-md'}
                                                `}
                                            >
                                                <img 
                                                    src={`https://api.dicebear.com/7.x/fun-emoji/svg?seed=${student.avatar || student.id}`} 
                                                    alt={student.name}
                                                    className="w-10 h-10 rounded-full bg-indigo-50 pointer-events-none"
                                                />
                                                <span className="text-sm font-semibold text-slate-700 truncate pointer-events-none">
                                                    {student.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Save Section for Generated Groups */}
                {groups.length > 0 && viewMode === "generated" && (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4 p-4 md:p-5 bg-white border-t border-slate-100 shrink-0">
                        <div className="flex-1 w-full">
                            <Label className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1.5 block">Group Set Name</Label>
                            <Input 
                                value={groupSetName}
                                onChange={(e) => setGroupSetName(e.target.value)}
                                className="font-bold text-slate-700 w-full"
                                placeholder="e.g. Activity Groups"
                            />
                        </div>
                        <Button 
                            onClick={handleSaveGroups} 
                            disabled={isSaving || hasSaved || !groupSetName.trim()}
                            variant={hasSaved ? "secondary" : "default"}
                            size="lg" 
                            className={`px-8 w-full md:w-auto rounded-xl shadow-md h-[42px] transition-all
                                ${hasSaved 
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 cursor-not-allowed border' 
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                        >
                            {isSaving ? "Saving..." : hasSaved ? t("groupSavedSuccess") : t("saveGroups")}
                        </Button>
                    </div>
                )}
                </>
                )}
                
                {viewMode === "saved" && (
                    <div className="flex-1 overflow-y-auto px-2 pb-4">
                        {savedGroups.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <Users className="w-12 h-12 mb-4 opacity-20" />
                                <p>No saved groups yet.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6">
                                {savedGroups.map((groupSet) => {
                                    const isFirstItemValidString = groupSet.studentIds.length > 0 && typeof groupSet.studentIds[0] === 'string';
                                    const isOldFormat = isFirstItemValidString && !groupSet.studentIds[0].startsWith('[') && !groupSet.studentIds[0].startsWith('{');

                                    const isEditing = editingSavedGroupId === groupSet.id;

                                    return (
                                        <div key={groupSet.id} className={`bg-slate-50 border rounded-3xl p-5 shadow-sm relative group transition-all ${isEditing ? 'border-indigo-300 ring-4 ring-indigo-50/50' : 'border-slate-200'}`}>
                                            <div className="absolute top-5 right-5 flex gap-2 z-10">
                                                {!isEditing ? (
                                                    <>
                                                        <button 
                                                            onClick={() => startEditingSavedGroup(groupSet)}
                                                            className="text-slate-400 opacity-0 md:group-hover:opacity-100 hover:text-indigo-600 transition-all bg-white rounded-full px-3 py-1.5 shadow-sm border border-slate-100 flex items-center gap-1.5 text-xs font-bold"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button 
                                                            onClick={(e) => {
                                                                if (window.confirm(t("deleteConfirm") || "Delete this group set?")) {
                                                                    handleDeleteSavedGroup(groupSet.id);
                                                                }
                                                            }}
                                                            className="text-slate-400 opacity-0 md:group-hover:opacity-100 hover:text-red-500 transition-all bg-white rounded-full p-1.5 shadow-sm border border-slate-100"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button variant="ghost" size="sm" onClick={() => setEditingSavedGroupId(null)} disabled={isSaving}>Cancel</Button>
                                                        <Button size="sm" onClick={() => handleSaveEditedGroup(groupSet)} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">Save</Button>
                                                    </>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center justify-between mb-5 border-b border-slate-200 pb-3 pr-40">
                                                {isEditing ? (
                                                    <Input 
                                                        value={editSavedGroupSetName}
                                                        onChange={(e) => setEditSavedGroupSetName(e.target.value)}
                                                        className="font-bold text-slate-700 text-xl border-indigo-200 focus:border-indigo-400 max-w-sm"
                                                    />
                                                ) : (
                                                    <h3 className="font-bold text-slate-700 text-xl">{groupSet.name}</h3>
                                                )}
                                            </div>
                                            
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                                {isOldFormat ? (
                                                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col h-full">
                                                        <div className="flex flex-col gap-2.5 mb-4">
                                                            {groupSet.studentIds.map(id => {
                                                                const s = students.find(st => st.id === id);
                                                                if (!s) return null;
                                                                return (
                                                                    <div key={s.id} className="flex items-center gap-3 bg-slate-50 p-2 pr-4 rounded-xl border border-slate-100">
                                                                        <img src={`https://api.dicebear.com/7.x/fun-emoji/svg?seed=${s.avatar || s.id}`} alt={s.name} className="w-8 h-8 rounded-full bg-indigo-50" />
                                                                        <span className="text-sm font-semibold text-slate-700 truncate">{s.name}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <Button 
                                                            onClick={() => setSelectedGroupForFeedback({name: groupSet.name, studentIds: groupSet.studentIds})}
                                                            variant="outline" 
                                                            className="w-full mt-auto bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                                        >
                                                            {t("giveFeedback")}
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    groupSet.studentIds.map((groupStr, index) => {
                                                        let parsedGroup: any = null;
                                                        let parsedIds: string[] = [];
                                                        let groupName = `Group ${index + 1}`;
                                                        
                                                        try {
                                                            // For some reason if the string isn't JSON, it will throw an error and we skip parsing it.
                                                            parsedGroup = JSON.parse(groupStr);
                                                            
                                                            // Handle old array format nested in json (v2) vs new object format (v3)
                                                            if (Array.isArray(parsedGroup)) {
                                                                parsedIds = parsedGroup;
                                                            } else if (parsedGroup && parsedGroup.studentIds) {
                                                                parsedIds = parsedGroup.studentIds;
                                                                groupName = parsedGroup.name || groupName;
                                                            }
                                                        } catch (e) {
                                                            console.error("Failed to parse group JSON:", groupStr, e);
                                                            return null;
                                                        }
                                                        
                                                        const groupStudents = parsedIds.map(id => students.find(s => s.id === id)).filter(Boolean) as Student[];
                                                        
                                                        return (
                                                            <div key={index} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col h-full overflow-hidden relative">
                                                                <div className="font-bold text-slate-600 mb-3 flex justify-between items-center border-b border-slate-100 pb-2">
                                                                    {isEditing ? (
                                                                        <Input 
                                                                            value={editSavedGroupNames[index] || ""}
                                                                            onChange={(e) => {
                                                                                const newNames = [...editSavedGroupNames];
                                                                                newNames[index] = e.target.value;
                                                                                setEditSavedGroupNames(newNames);
                                                                            }}
                                                                            className="font-bold text-slate-700 border-indigo-200 focus:border-indigo-400 h-8"
                                                                        />
                                                                    ) : (
                                                                        <span>{groupName}</span>
                                                                    )}
                                                                    <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full ml-2 shrink-0">{groupStudents.length}</span>
                                                                </div>
                                                                <div className="flex flex-col gap-2 mb-4">
                                                                    {groupStudents.map(student => (
                                                                        <div key={student.id} className="flex items-center gap-3 bg-slate-50 p-2 pr-4 rounded-xl border border-slate-100 transition-colors hover:border-indigo-200">
                                                                            <img src={`https://api.dicebear.com/7.x/fun-emoji/svg?seed=${student.avatar || student.id}`} alt={student.name} className="w-8 h-8 rounded-full bg-indigo-50" />
                                                                            <span className="text-sm font-semibold text-slate-700 truncate">{student.name}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                {!isEditing && (
                                                                    <Button 
                                                                        onClick={() => setSelectedGroupForFeedback({name: `${groupSet.name} - ${groupName}`, studentIds: parsedIds})}
                                                                        variant="outline" 
                                                                        className="w-full mt-auto bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                                                    >
                                                                        {t("giveFeedback")}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

            </div>
            
            {/* Group Feedback Modal */}
            {selectedGroupForFeedback && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-sm z-10">
                            <div>
                                <h2 className="text-xl font-bold">{t("giveFeedback")}</h2>
                                <p className="text-sm text-slate-500">{selectedGroupForFeedback.name}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedGroupForFeedback(null)} className="rounded-full">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                        
                        <div className="p-4 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-3 pb-6">
                                {skills.map(skill => {
                                    const isPositive = skill.type === "POSITIVE";
                                    const Icon = iconMap[skill.icon] || (isPositive ? iconMap["default"] : AlertCircle);
                                    
                                    return (
                                        <Button
                                            key={skill.id}
                                            variant="outline"
                                            className={cn(
                                                "h-auto flex-col gap-2 p-4 transition-all w-full",
                                                isPositive 
                                                    ? "hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700" 
                                                    : "hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700",
                                                isAwarding && "opacity-50 pointer-events-none"
                                            )}
                                            onClick={() => handleAwardGroupPoints(skill.id)}
                                            disabled={isAwarding}
                                        >
                                            <div className={cn("p-3 rounded-full", isPositive ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600")}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <span className="font-semibold text-sm text-center whitespace-normal leading-tight">
                                                {skill.name}
                                            </span>
                                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", isPositive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                                                {isPositive ? `+${skill.weight}` : skill.weight}
                                            </span>
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
