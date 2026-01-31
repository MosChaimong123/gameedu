"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Circle } from "lucide-react"
import { useState } from "react"

const TEACHER_QUESTS = [
    { id: 1, title: "Create a new Question Set", reward: 50, completed: false },
    { id: 2, title: "Host a Game session", reward: 100, completed: false },
    { id: 3, title: "View a Game Report", reward: 30, completed: true },
]

const STUDENT_QUESTS = [
    { id: 1, title: "Play 3 matches", reward: 50, completed: false },
    { id: 2, title: "Win a game", reward: 100, completed: false },
    { id: 3, title: "Earn 1000 XP", reward: 30, completed: true },
]

export function QuestList({ role }: { role?: string }) {
    const [quests, setQuests] = useState(role === "STUDENT" ? STUDENT_QUESTS : TEACHER_QUESTS)

    return (
        <Card className="border-2 border-slate-100 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-50">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    🎯 Daily Quests
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
                {quests.map((quest) => (
                    <div key={quest.id} className="flex items-start gap-3 group">
                        <div className={`mt-0.5 transition-colors ${quest.completed ? "text-green-500" : "text-slate-300 group-hover:text-slate-400"}`}>
                            {quest.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                            <p className={`text-sm font-medium ${quest.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>
                                {quest.title}
                            </p>
                            <div className="text-xs font-bold text-amber-500 mt-0.5">
                                +{quest.reward} Tokens
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
