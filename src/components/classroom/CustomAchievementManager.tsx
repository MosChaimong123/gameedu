"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Award, Gift, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/GlassCard";
import { useToast } from "@/components/ui/use-toast";

interface CustomAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  goldReward: number;
}

interface Student {
  id: string;
  name: string;
}

interface CustomAchievementManagerProps {
  classId: string;
  students: Student[];
}

const ICON_PRESETS = ["🏆","🌟","💎","🔥","⚔️","🛡️","🎓","🦁","🐉","🎯","🚀","🌈","🌸","🦋","👑","🎪","🌙","⚡","💪","🎭"];

export function CustomAchievementManager({ classId, students }: CustomAchievementManagerProps) {
  const [achievements, setAchievements] = useState<CustomAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [awardingId, setAwardingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state
  const [form, setForm] = useState({ name: "", description: "", icon: "🏆", goldReward: "100" });
  const [showForm, setShowForm] = useState(false);

  // Award state - which achievement is being awarded to which student
  const [awardPanel, setAwardPanel] = useState<string | null>(null); // achievementId
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const loadAchievements = useCallback(async () => {
    const res = await fetch(`/api/classrooms/${classId}/custom-achievements`);
    const data = await res.json();
    setAchievements(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [classId]);

  useEffect(() => { void loadAchievements(); }, [loadAchievements]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/classrooms/${classId}/custom-achievements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          icon: form.icon,
          goldReward: Number(form.goldReward)
        })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "สร้างรางวัลสำเร็จ! 🏆", description: `"${form.name}" พร้อมมอบให้นักเรียนแล้ว` });
        setForm({ name: "", description: "", icon: "🏆", goldReward: "100" });
        setShowForm(false);
        loadAchievements();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (achievementId: string) => {
    if (!confirm("ต้องการลบรางวัลนี้หรือไม่?")) return;
    await fetch(`/api/classrooms/${classId}/custom-achievements`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ achievementId })
    });
    loadAchievements();
  };

  const handleAward = async (achievementId: string) => {
    if (!selectedStudentId) {
      toast({ title: "กรุณาเลือกนักเรียนก่อน", variant: "destructive" });
      return;
    }
    setAwardingId(achievementId);
    try {
      const res = await fetch(`/api/classrooms/${classId}/custom-achievements/award`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ achievementId, studentId: selectedStudentId })
      });
      const data = await res.json();
      if (data.success) {
        const student = students.find(s => s.id === selectedStudentId);
        toast({
          title: "มอบรางวัลสำเร็จ! 🎉",
          description: `${student?.name} ได้รับรางวัลและ ${data.goldAwarded} Gold แล้ว!`
        });
        setAwardPanel(null);
        setSelectedStudentId("");
      } else {
        toast({ title: "ไม่สามารถมอบรางวัลได้", description: data.error, variant: "destructive" });
      }
    } finally {
      setAwardingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            รางวัลพิเศษจากครู
          </h3>
          <p className="text-xs text-slate-400 font-bold mt-0.5">กำหนดและมอบ Achievement ให้นักเรียนด้วยตนเอง</p>
        </div>
        <Button
          onClick={() => setShowForm(v => !v)}
          className="bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          สร้างรางวัลใหม่
        </Button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <GlassCard className="p-5 border-amber-200/50 bg-amber-50/30 space-y-4">
              <p className="font-black text-slate-700 text-sm">✨ สร้างรางวัลใหม่</p>

              {/* Icon Picker */}
              <div>
                <Label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">Icon</Label>
                <div className="flex flex-wrap gap-2">
                  {ICON_PRESETS.map(ic => (
                    <button
                      key={ic}
                      onClick={() => setForm(f => ({ ...f, icon: ic }))}
                      className={`text-xl p-1.5 rounded-xl border-2 transition-all ${form.icon === ic ? "border-amber-400 bg-amber-50 scale-110" : "border-transparent hover:border-slate-200"}`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">ชื่อรางวัล *</Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="เช่น นักสู้ผู้กล้าหาญ"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">รางวัล Gold</Label>
                  <Input
                    type="number"
                    value={form.goldReward}
                    onChange={e => setForm(f => ({ ...f, goldReward: e.target.value }))}
                    placeholder="100"
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">คำอธิบาย</Label>
                <Input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="เช่น สำหรับนักเรียนที่แสดงความกล้าหาญในชั้นเรียน"
                  className="rounded-xl"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreate}
                  disabled={creating || !form.name.trim()}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl"
                >
                  {creating ? "กำลังสร้าง..." : "✓ สร้างรางวัล"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)} className="font-black text-xs rounded-xl">
                  ยกเลิก
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievement List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-16 bg-white/20 animate-pulse rounded-2xl" />)}
        </div>
      ) : achievements.length === 0 ? (
        <div className="text-center py-10 bg-white/30 rounded-2xl border border-dashed border-slate-200">
          <Award className="w-10 h-10 text-slate-200 mx-auto mb-2" />
          <p className="text-slate-400 font-bold text-sm">ยังไม่มีรางวัลพิเศษ</p>
          <p className="text-slate-300 text-xs mt-1">กดปุ่ม &quot;สร้างรางวัลใหม่&quot; เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="space-y-3">
          {achievements.map(ach => (
            <GlassCard key={ach.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className="text-3xl shrink-0">{ach.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-800 text-sm">{ach.name}</p>
                  {ach.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{ach.description}</p>}
                  <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 mt-1 inline-block">
                    +{ach.goldReward} Gold
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    onClick={() => { setAwardPanel(awardPanel === ach.id ? null : ach.id); setSelectedStudentId(""); }}
                    className="h-8 px-3 text-[10px] font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center gap-1"
                  >
                    <Gift className="w-3 h-3" />
                    มอบให้นักเรียน
                  </Button>
                  <Button
                    onClick={() => handleDelete(ach.id)}
                    variant="outline"
                    className="h-8 w-8 p-0 rounded-xl border-rose-100 text-rose-400 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Award Panel */}
              <AnimatePresence>
                {awardPanel === ach.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <select
                        value={selectedStudentId}
                        onChange={e => setSelectedStudentId(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 bg-white outline-none focus:border-emerald-400"
                      >
                        <option value="">— เลือกนักเรียน —</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <Button
                        onClick={() => handleAward(ach.id)}
                        disabled={!selectedStudentId || awardingId === ach.id}
                        className="h-9 px-4 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5"
                      >
                        <Send className="w-3 h-3" />
                        {awardingId === ach.id ? "กำลังมอบ..." : "ยืนยันมอบรางวัล"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

