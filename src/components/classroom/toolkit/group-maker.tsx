"use client";

import { useState } from "react";
import { Student } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { X, Users, RefreshCw } from "lucide-react";
import { StudentAvatar } from "../student-avatar";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GroupMakerProps {
    students: Student[];
    onClose: () => void;
}

export function GroupMaker({ students, onClose }: GroupMakerProps) {
    const [groupCount, setGroupCount] = useState(4);
    const [groups, setGroups] = useState<Student[][]>([]);

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

                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
                        <Users className="w-6 h-6 text-indigo-500" />
                        Group Maker
                    </h2>
                    <p className="text-slate-500">Divide {students.length} students into groups</p>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-8 mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-4">
                        <Label>Number of Groups:</Label>
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

                    <Button onClick={createGroups} size="lg" className="px-8">
                        {groups.length > 0 ? <><RefreshCw className="w-4 h-4 mr-2" /> Reshuffle</> : "Create Groups"}
                    </Button>
                </div>

                {/* Groups Display */}
                <div className="flex-1 overflow-y-auto px-2">
                    {groups.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-400 italic">
                            Select number of groups and click Create
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {groups.map((group, i) => (
                                <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                                        <h3 className="font-bold text-slate-700">Group {i + 1}</h3>
                                        <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                                            {group.length} members
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {group.map(student => (
                                            <div key={student.id} className="flex items-center gap-2 bg-white p-1 pr-3 rounded-full border border-slate-100 shadow-sm">
                                                <StudentAvatar
                                                    id={student.id}
                                                    name={student.name}
                                                    avatarSeed={student.avatar || student.id}
                                                    points={student.points}
                                                    className="w-8 h-8 text-xs"
                                                />
                                                <span className="text-sm font-medium text-slate-700 truncate max-w-[80px]">
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

            </div>
        </div>
    );
}
