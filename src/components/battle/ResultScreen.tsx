"use client"

import { useRouter } from "next/navigation"
import { FinalReward } from "@/lib/types/game"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ResultScreenProps {
  rewards: FinalReward[]
  myStudentId: string
}

export function ResultScreen({ rewards, myStudentId }: ResultScreenProps) {
  const router = useRouter()
  const myReward = rewards.find((r) => r.studentId === myStudentId)
  const otherRewards = rewards.filter((r) => r.studentId !== myStudentId)

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center p-6">
      <h1 className="text-4xl font-black text-amber-400 mb-8 mt-4">จบการต่อสู้แล้ว!</h1>

      {myReward && (
        <Card className="w-full max-w-md bg-indigo-900/60 border-indigo-500 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl font-bold text-white">{myReward.playerName}</span>
            {myReward.leveledUp && (
              <Badge className="bg-amber-500 text-black font-bold animate-pulse">
                LEVEL UP! -&gt; {myReward.newLevel}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-800/60 rounded-lg p-3 text-center">
              <div className="text-2xl font-black text-amber-400">
                +{myReward.earnedGold.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 mt-1">Gold ที่ได้รับ</div>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3 text-center">
              <div className="text-2xl font-black text-green-400">
                +{myReward.earnedXp.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 mt-1">XP ที่ได้รับ</div>
            </div>
          </div>

          {myReward.itemDrops.length > 0 && (
            <div>
              <div className="text-sm text-slate-400 mb-2">ไอเทมที่ได้รับ</div>
              <div className="flex flex-wrap gap-2">
                {myReward.itemDrops.map((item, i) => (
                  <Badge key={i} className="bg-purple-700 text-white">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {myReward.error && (
            <div className="mt-3 text-xs text-red-400 bg-red-900/30 rounded p-2">
              รางวัลบางส่วนอาจบันทึกไม่สำเร็จ กรุณาแจ้งคุณครู
            </div>
          )}
        </Card>
      )}

      {otherRewards.length > 0 && (
        <div className="w-full max-w-md space-y-2 mb-8">
          <div className="text-sm text-slate-400 mb-3">ผู้เล่นคนอื่น</div>
          {otherRewards.map((r) => (
            <div
              key={r.studentId}
              className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{r.playerName}</span>
                {r.leveledUp && (
                  <Badge className="bg-amber-500 text-black text-xs">LEVEL UP</Badge>
                )}
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-amber-400">+{r.earnedGold}g</span>
                <span className="text-green-400">+{r.earnedXp}xp</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        size="lg"
        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8"
        onClick={() => router.push("/play")}
      >
        กลับไปหน้า Lobby
      </Button>
    </div>
  )
}
