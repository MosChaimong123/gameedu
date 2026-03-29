"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Zap, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/GlassCard";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";

interface ClassEvent {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: string;
  multiplier: number;
  startAt: string;
  endAt: string;
  active: boolean;
}

const EVENT_ICONS = ["⚡","🔥","💥","🌟","🎉","🎯","🚀","🌈","💎","👑","🎪","🌙"];
const EVENT_TYPES = [
  { value: "GOLD_BOOST", label: "🪙 Gold Rate x2", multiplier: 2 },
  { value: "GOLD_BOOST_3", label: "🪙 Gold Rate x3", multiplier: 3 },
  { value: "CUSTOM", label: "✨ Custom Event", multiplier: 1 },
];

export function EventManagerButton({ classId }: { classId: string }) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<ClassEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: "", description: "", icon: "⚡", type: "GOLD_BOOST",
    multiplier: "2",
    startAt: new Date().toISOString().slice(0, 16),
    endAt: new Date(Date.now() + 7 * 24 * 3600000).toISOString().slice(0, 16),
  });

  const loadEvents = useCallback(async () => {
    const res = await fetch(`/api/classrooms/${classId}/events`);
    const data = await res.json();
    setEvents(Array.isArray(data) ? data : []);
  }, [classId]);

  useEffect(() => { if (open) void loadEvents(); }, [open, loadEvents]);

  const handleTypeChange = (type: string) => {
    const preset = EVENT_TYPES.find(t => t.value === type);
    setForm(f => ({ ...f, type, multiplier: String(preset?.multiplier || 1) }));
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/classrooms/${classId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          multiplier: Number(form.multiplier),
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
        })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "สร้าง Event สำเร็จ! ⚡", description: form.title });
        setShowForm(false);
        setForm(f => ({ ...f, title: "", description: "" }));
        loadEvents();
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("ลบ Event นี้หรือไม่?")) return;
    await fetch(`/api/classrooms/${classId}/events`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId })
    });
    loadEvents();
  };

  const now = new Date();
  const isActive = (e: ClassEvent) => new Date(e.startAt) <= now && new Date(e.endAt) >= now;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="h-9 bg-purple-500/80 hover:bg-purple-500 text-white border-0 font-semibold shadow backdrop-blur-sm flex items-center gap-1.5"
        >
          <Zap className="w-4 h-4" />
          Event พิเศษ
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] flex flex-col p-6 rounded-3xl shadow-2xl border-0 overflow-y-auto bg-[#F8FAFC]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-black text-slate-800">
            <Zap className="w-5 h-5 text-purple-500 fill-purple-400" />
            จัดการ Event พิเศษ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Create Button */}
          <Button
            onClick={() => setShowForm(v => !v)}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-black text-sm rounded-xl flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            สร้าง Event ใหม่
          </Button>

          {/* Create Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <GlassCard className="p-4 border-purple-200/50 bg-purple-50/30 space-y-4">
                  {/* Icon */}
                  <div className="flex flex-wrap gap-2">
                    {EVENT_ICONS.map(ic => (
                      <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))}
                        className={`text-xl p-1.5 rounded-xl border-2 transition-all ${form.icon === ic ? "border-purple-400 bg-purple-50 scale-110" : "border-transparent hover:border-slate-200"}`}>
                        {ic}
                      </button>
                    ))}
                  </div>

                  {/* Type */}
                  <div>
                    <Label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">ประเภท Event</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {EVENT_TYPES.map(t => (
                        <button key={t.value} onClick={() => handleTypeChange(t.value)}
                          className={`text-xs font-black p-2 rounded-xl border-2 transition-all ${form.type === t.value ? "border-purple-400 bg-purple-50" : "border-slate-100 bg-white hover:border-slate-200"}`}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">ชื่อ Event *</Label>
                      <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="เช่น สัปดาห์ทองคำ 🥇" className="rounded-xl" />
                    </div>
                    <div>
                      <Label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Multiplier</Label>
                      <Input type="number" value={form.multiplier} onChange={e => setForm(f => ({ ...f, multiplier: e.target.value }))} min="1" max="10" className="rounded-xl" />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">คำอธิบาย</Label>
                    <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="รายละเอียดของ Event" className="rounded-xl" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">เริ่ม</Label>
                      <Input type="datetime-local" value={form.startAt} onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))} className="rounded-xl text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">สิ้นสุด</Label>
                      <Input type="datetime-local" value={form.endAt} onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))} className="rounded-xl text-xs" />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleCreate} disabled={saving || !form.title.trim()} className="bg-purple-500 hover:bg-purple-600 text-white font-black text-xs rounded-xl">
                      {saving ? "กำลังสร้าง..." : "✓ สร้าง Event"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowForm(false)} className="font-black text-xs rounded-xl">ยกเลิก</Button>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Event List */}
          {events.length === 0 ? (
            <div className="text-center py-8 bg-white/30 rounded-2xl border border-dashed border-slate-200">
              <Calendar className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 font-bold text-sm">ยังไม่มี Event</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(ev => (
                <GlassCard key={ev.id} className={`p-3.5 flex items-center gap-3 border-2 ${isActive(ev) ? "border-purple-300 bg-purple-50/30" : "border-slate-100"}`}>
                  <div className="text-2xl shrink-0">{ev.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-sm text-slate-800 leading-tight">{ev.title}</p>
                      {ev.multiplier > 1 && <span className="text-[9px] font-black text-white bg-purple-500 px-1.5 py-0.5 rounded-full">x{ev.multiplier}</span>}
                      {isActive(ev) && <span className="text-[9px] font-black text-white bg-emerald-500 px-1.5 py-0.5 rounded-full">LIVE</span>}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(ev.startAt).toLocaleDateString("th-TH")} → {new Date(ev.endAt).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                  <Button onClick={() => handleDelete(ev.id)} variant="outline"
                    className="h-7 w-7 p-0 rounded-xl border-rose-100 text-rose-400 hover:bg-rose-50 shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
