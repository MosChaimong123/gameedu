"use client"

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sword, Shield, Clock, Zap, Send, Check, X, RefreshCw } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

interface BattleStudent {
  id: string;
  name: string;
  avatar: string | null;
  points: number;
  gameStats: any;
}

interface Battle {
  id: string;
  challengerId: string;
  defenderId: string;
  betAmount: number;
  status: string;
  winnerId: string | null;
  challengerRoll: number | null;
  defenderRoll: number | null;
  createdAt: string;
  resolvedAt: string | null;
  challenger: BattleStudent;
  defender?: BattleStudent;
}

interface ArenaData {
  pending: Battle[];
  recent: Battle[];
  classmates: BattleStudent[];
  studentId: string;
}

export function PvPArenaTab({ code, gold }: { code: string; gold: number }) {
  const [data, setData] = useState<ArenaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [betAmount, setBetAmount] = useState("50");
  const [selectedTarget, setSelectedTarget] = useState("");
  const [challenging, setChallenging] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<any | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/student/${code}/battles`);
    const d = await res.json();
    setData(d);
    setLoading(false);
  }, [code]);

  useEffect(() => { load(); }, [load]);

  const handleChallenge = async () => {
    if (!selectedTarget) { toast({ title: "เลือกคู่ต่อสู้ก่อน", variant: "destructive" }); return; }
    setChallenging(true);
    try {
      const res = await fetch(`/api/student/${code}/battles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defenderId: selectedTarget, betAmount: Number(betAmount) })
      });
      const d = await res.json();
      if (d.success) {
        toast({ title: "ส่งคำท้าดวลแล้ว! ⚔️", description: "รอคู่ต่อสู้ตอบรับครับ" });
        setSelectedTarget(""); load();
      } else {
        toast({ title: d.error, variant: "destructive" });
      }
    } finally { setChallenging(false); }
  };

  const handleAccept = async (battleId: string) => {
    setResolving(battleId);
    try {
      const res = await fetch(`/api/student/${code}/battles/${battleId}/accept`, { method: "POST" });
      const d = await res.json();
      if (d.success) {
        setBattleResult({ ...d, myId: data?.studentId });
        load();
      } else {
        toast({ title: d.error, variant: "destructive" });
      }
    } finally { setResolving(null); }
  };

  const handleDecline = async (battleId: string) => {
    setResolving(battleId);
    await fetch(`/api/student/${code}/battles/${battleId}/decline`, { method: "POST" });
    toast({ title: "ปฏิเสธการดวลแล้ว" });
    setResolving(null);
    load();
  };

  const myId = data?.studentId || "";

  return (
    <div className="space-y-8">

      {/* ====== Battle Result Overlay ====== */}
      <AnimatePresence>
        {battleResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setBattleResult(null)}
          >
            <motion.div
              initial={{ scale: 0.4, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.55 }}
              className="bg-white rounded-3xl p-8 max-w-xs w-full shadow-2xl text-center"
              onClick={e => e.stopPropagation()}
            >
              {battleResult.winnerId === myId ? (
                <>
                  <motion.div className="text-7xl mb-3"
                    animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6 }}>🏆</motion.div>
                  <h2 className="text-3xl font-black text-amber-500 mb-1">ชนะ!</h2>
                  <p className="text-slate-500 font-bold text-sm">ได้รับ <span className="text-amber-600 font-black text-lg">+{battleResult.betAmount} 🪙</span></p>
                </>
              ) : (
                <>
                  <div className="text-7xl mb-3">💀</div>
                  <h2 className="text-3xl font-black text-red-500 mb-1">แพ้!</h2>
                  <p className="text-slate-500 font-bold text-sm">เสีย <span className="text-red-500 font-black text-lg">-{battleResult.betAmount} 🪙</span></p>
                </>
              )}

              {/* Dice Rolls Display */}
              <div className="mt-5 flex items-center justify-center gap-5">
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ลูกเต๋าคุณ</span>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black border-4 shadow-md ${
                    battleResult.winnerId === myId
                      ? "border-amber-400 bg-amber-50 text-amber-700"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}>
                    {battleResult.winnerId === myId ? battleResult.challengerRoll : battleResult.defenderRoll}
                  </div>
                </div>
                <Sword className="w-7 h-7 text-slate-300" />
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">คู่ต่อสู้</span>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black border-4 shadow-md ${
                    battleResult.winnerId !== myId
                      ? "border-red-400 bg-red-50 text-red-700"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}>
                    {battleResult.winnerId !== myId ? battleResult.challengerRoll : battleResult.defenderRoll}
                  </div>
                </div>
              </div>

              <Button onClick={() => setBattleResult(null)}
                className="mt-6 w-full rounded-2xl font-black bg-slate-800 hover:bg-slate-900 text-white">
                ปิด
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== Header ====== */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Sword className="w-6 h-6 text-rose-500" /> PvP Arena
          </h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">ดวลเดิมพัน Gold กับเพื่อนร่วมห้อง</p>
        </div>
        <button onClick={load}
          className="p-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-600">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ====== Mechanic Info ====== */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 text-xs text-indigo-700 font-bold space-y-1">
        <p>⚔️ <span className="font-black">วิธีดวล:</span> แต้มพฤติกรรม + Gold + ไอเทม = พลัง → โยนลูกเต๋า → ชนะได้ Gold เดิมพัน!</p>
        <p>🎲 <span className="font-black">สูตร:</span> พลัง (70%) + ดวง (30%) — ต่อให้พลังสูง ยังมีลุ้นอยู่เสมอ</p>
      </div>

      {/* ====== Pending Incoming Challenges ====== */}
      {!loading && (data?.pending || []).length > 0 && (
        <div>
          <h3 className="text-sm font-black text-rose-600 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 fill-rose-500 text-rose-500" />
            มีคนท้าคุณ! ({data?.pending.length})
          </h3>
          <div className="space-y-3">
            {(data?.pending || []).map(b => (
              <motion.div key={b.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-rose-300 bg-gradient-to-r from-rose-50 to-orange-50 shadow-sm shadow-rose-100"
              >
                <div className="text-3xl shrink-0">{b.challenger.avatar || "⚔️"}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-800">{b.challenger.name}</p>
                  <p className="text-xs text-slate-500 font-bold">ท้าดวลเดิมพัน <span className="text-amber-600 font-black">🪙 {b.betAmount} Gold</span></p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    แต้ม: ⭐{b.challenger.points} · Gold: 🪙{(b.challenger.gameStats as any)?.gold || 0}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button onClick={() => handleAccept(b.id)} disabled={resolving === b.id}
                    className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    {resolving === b.id ? "..." : "รับ!"}
                  </Button>
                  <Button onClick={() => handleDecline(b.id)} disabled={resolving === b.id}
                    variant="outline" className="h-9 w-9 p-0 rounded-xl border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ====== Challenge Form ====== */}
      <GlassCard className="p-5 bg-gradient-to-br from-slate-50 to-rose-50/40 border-2 border-slate-100">
        <p className="font-black text-slate-800 text-sm mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-rose-500 fill-rose-400" />
          ส่งคำท้าดวล
        </p>
        <div className="flex gap-3">
          <select value={selectedTarget} onChange={e => setSelectedTarget(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 bg-white outline-none focus:border-rose-400 transition-colors">
            <option value="">— เลือกคู่ต่อสู้ —</option>
            {(data?.classmates || []).map(s => (
              <option key={s.id} value={s.id}>
                {s.avatar || "🎮"} {s.name}  (⭐{s.points} · 🪙{(s.gameStats as any)?.gold || 0})
              </option>
            ))}
          </select>
          <div className="w-28 shrink-0">
            <Input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)}
              min="10" max="500" placeholder="Gold"
              className="rounded-xl text-sm font-black text-amber-700 border-amber-200 focus:border-amber-400" />
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-slate-400 font-bold">
            Gold คุณ: <span className="text-amber-600 font-black">🪙 {gold.toLocaleString()}</span>
            {Number(betAmount) > gold && <span className="text-red-500 font-black ml-2">⚠ ไม่พอ!</span>}
          </p>
          <Button onClick={handleChallenge}
            disabled={challenging || !selectedTarget || Number(betAmount) > gold || Number(betAmount) < 10}
            className="bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl flex items-center gap-1.5 px-5 shadow-md shadow-rose-200">
            <Send className="w-3.5 h-3.5" />
            {challenging ? "กำลังส่ง..." : "ท้าดวล! ⚔️"}
          </Button>
        </div>
      </GlassCard>

      {/* ====== Battle History ====== */}
      <div>
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" /> ประวัติการดวล
        </h3>
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-16 bg-white/30 animate-pulse rounded-2xl mb-2" />)
        ) : (data?.recent || []).length === 0 ? (
          <div className="text-center py-12 bg-white/30 rounded-2xl border-2 border-dashed border-slate-100">
            <Sword className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-bold text-sm">ยังไม่มีประวัติการดวล</p>
            <p className="text-slate-300 text-xs mt-1">ท้าดวลกับเพื่อนได้เลยครับ!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {(data?.recent || []).map(b => {
              const iWon = b.winnerId === myId;
              const isChallenger = b.challengerId === myId;
              const opponent = isChallenger ? b.defender : b.challenger;
              const myRoll = isChallenger ? b.challengerRoll : b.defenderRoll;
              const oppRoll = isChallenger ? b.defenderRoll : b.challengerRoll;
              return (
                <GlassCard key={b.id} className={`p-4 flex items-center gap-4 border-2 ${iWon ? "border-amber-200/60 bg-amber-50/30" : "border-slate-100"}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${iWon ? "bg-amber-100" : "bg-slate-100"}`}>
                    {iWon ? "🏆" : "💀"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-black text-sm leading-tight ${iWon ? "text-amber-700" : "text-slate-600"}`}>
                      {iWon ? "ชนะ" : "แพ้"} vs {opponent?.name || "?"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      🎲 คุณ: <span className="font-black">{myRoll}</span>  vs  คู่: <span className="font-black">{oppRoll}</span>
                    </p>
                  </div>
                  <div className={`font-black text-sm shrink-0 ${iWon ? "text-amber-600" : "text-red-400"}`}>
                    {iWon ? "+" : "-"}{b.betAmount} 🪙
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
