"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, GraduationCap, ArrowRight } from "lucide-react";
import Link from "next/link";

interface ClassroomCardProps {
    id: string;
    name: string;
    grade: string | null;
    studentCount: number;
    image?: string;
}

export function ClassroomCard({
    id,
    name,
    grade,
    studentCount,
    image
}: ClassroomCardProps) {
    return (
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-blue-400 to-indigo-500 relative">
                {/* Decorative Pattern or Image */}
                <div className="absolute inset-0 opacity-20 bg-[url('/patterns/grid.svg')]"></div>

                {/* Class Icon */}
                <div className="absolute -bottom-6 left-6">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center text-2xl">
                        {image || "🎓"}
                    </div>
                </div>
            </div>

            <CardHeader className="pt-10 pb-2">
                <CardTitle className="text-xl">{name}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                    <GraduationCap className="w-4 h-4" />
                    {grade || "No Grade"}
                </CardDescription>
            </CardHeader>

            <CardContent>
                <div className="flex items-center gap-2 text-slate-600 text-sm">
                    <Users className="w-4 h-4" />
                    <span>{studentCount} Students</span>
                </div>
            </CardContent>

            <CardFooter className="pt-0">
                <Link href={`/dashboard/classrooms/${id}`} className="w-full">
                    <Button className="w-full" variant="outline">
                        Open Classroom <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    );
}
