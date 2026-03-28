"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import {
  BASE_CLASSES,
  ADVANCE_CLASS_OPTIONS,
  MASTER_CLASS_OPTIONS,
} from "@/lib/game/job-constants"
import { getMergedClassDef, Skill } from "@/lib/game/job-system"

interface JobSelectionModalProps {
  studentId: string
  level: number
  jobClass: string | null
  jobTier: string
  advanceClass: string | null
  onClose: () => void
  onJobSelected: () => void
}

const CLASS_ICONS: Record<string, string> = {
  WARRIOR: "⚔️", MAGE: "🔮", RANGER: "🏹", HEALER: "✨", ROGUE: "🗡️",
  KNIGHT: "🛡️", BERSERKER: "🪓", ARCHMAGE: "🌟", WARLOCK: "💀",
  SNIPER: "🎯", BEASTMASTER: "🐉", SAINT: "😇", DRUID: "🌿",
  ASSASSIN: "🌑", DUELIST: "⚡",
  PALADIN: "⚖️", GUARDIAN: "🏰", WARLORD: "🚩", "DEATH KNIGHT": "🌒",
  "GRAND WIZARD": "🌌", ELEMENTALIST: "🌪️", LICH: "☠️", "SHADOW MAGE": "🌘",
  HAWKEYE: "👁️", DEADEYE: "💥", "BEAST KING": "🦁", TAMER: "🐾",
  ARCHBISHOP: "🕌", "DIVINE HERALD": "🎺", "ELDER DRUID": "🌳", "NATURE WARDEN": "🦌",
  "SHADOW LORD": "👑", PHANTOM: "👻", "BLADE MASTER": "🌀", "SWORD SAINT": "⚔️",
}

const CLASS_DESCRIPTIONS: Record<string, string> = {
  WARRIOR: "นักรบผู้กล้าหาญ เน้นพลังป้องกันและพลังชีวิตที่สูงที่สุดในบรรดาทุกอาชีพ",
  MAGE: "ผู้ใช้เวทมนตร์ พลังทำลายล้างรุนแรงในวงกว้าง แต่อ่อนแอต่อการโจมตีกายภาพ",
  RANGER: "นักล่าผู้รวดเร็ว โจมตีจากระยะไกลด้วยความแม่นยำและโอกาสคริติคอลที่สูง",
  HEALER: "ผู้เยียวยา สนับสนุนทีมด้วยคาถาฟื้นฟูและบัฟเสริมพลังเวทมนตร์",
  ROGUE: "จารชน ผู้ว่องไวเหนือแสง โจมตีจุดตายด้วยความเร็วและโอกาสคริติคอลมหาศาล",
  KNIGHT: "อัศวินผู้พิทักษ์ พัฒนาการป้องกันให้แข็งแกร่งขึ้น พร้อมปกป้องสหายในทุกสถานการณ์",
  BERSERKER: "นักรบคลั่ง แลกพลังป้องกันเพื่อพลังโจมตีที่รุนแรงและป่าเถื่อน",
  ARCHMAGE: "จอมเวทผู้เชี่ยวชาญ ค้นพบคัมภีร์เวทโบราณ เพิ่มพลังทำลายเวทให้ถึงขีดสุด",
  WARLOCK: "ผู้อัญเชิญความมืด ใช้มนตราต้องห้ามและพิษในการกัดกร่อนศัตรู",
  SNIPER: "พลแม่นปืน เน้นการโจมตีทะลุทะลวงและจุดตายจากระยะไกล",
  BEASTMASTER: "ผู้ฝึกสัตว์ สื่อสารและนำทางสัตว์ป่าร่วงร่วมต่อสู้ในสนามรบ",
  SAINT: "นักบุญผู้ศักดิ์สิทธิ์ พลังการรักษาสูงส่งและสามารถชำระล้างคำสาปได้",
  DRUID: "ผู้อัญเชิญธรรมชาติ ใช้พลังแห่งป่าและสัตว์ป่าในการรักษารวมถึงโจมตี",
  ASSASSIN: "นักฆ่ามือสังหาร เงียบเชียบ ดุดัน และปลิดชีพศัตรูภายในพริบตา",
  DUELIST: "นักดาบผู้สง่างาม เน้นเทคนิคการร่ายรำดาบและการสวนกลับที่เฉียบคม",
  PALADIN: "อัศวินศักดิ์สิทธิ์ ผสมผสานการป้องกันอันแข็งแกร่งกับเวทมนตร์แสงสว่าง",
  GUARDIAN: "ผู้รักษาปราการ พลังป้องกันดุจกำแพงเหล็กที่ไม่มีวันพังทลาย",
  WARLORD: "แม่ทัพผู้เกรงขาม เพิ่มขวัญกำลังใจและนำพาชัยชนะมาสู่กองทัพ",
  "DEATH KNIGHT": "อัศวินแห่งความตาย กลืนกินวิญญาณศัตรูเพื่อเพิ่มพลังให้กับตนเอง",
  "GRAND WIZARD": "มหาจอมเวท เข้าถึงแก่นแท้ของจักรวาล ร่ายมนตราที่สั่นสะเทือนปฐพี",
  ELEMENTALIST: "ผู้ควบคุมธาตุ ผสมผสานพลัง ดิน น้ำ ลม ไฟ เป็นหนึ่งเดียว",
  LICH: "อมตะผู้วายชนม์ สละความเป็นมนุษย์เพื่อพลังเวทสายมืดอันไร้ขีดจำกัด",
  "SHADOW MAGE": "จอมเวทเงา ควบคุมมิติแห่งเงาเพื่อกักขังและทำลายล้าง",
  HAWKEYE: "เนตรเหยี่ยว มองเห็นทุกความเคลื่อนไหว ไม่มีเป้าหมายใดหลบหนีพ้น",
  DEADEYE: "มือสังหารระยะไกล ปืนทุกนัดคือความตายที่ไม่อาจหลีกเลี่ยง",
  "BEAST KING": "ราชันแห่งสัตว์ป่า คำรามกึกก้องเรียกฝูงสัตว์มาถล่มศัตรู",
  TAMER: "ผู้เชื่อมต่อชีวิต ควบคุมสัตว์ในตำนานด้วยพันธสัญญาทางวิญญาณ",
  ARCHBISHOP: "พระสังฆราช พลังปาฏิหาริย์ที่สามารถคืนชีพและปกป้องทุกสิ่ง",
  "DIVINE HERALD": "ผู้นำสารสวรรค์ เป่าแตรแห่งสวรรค์เพื่อประทานพรและชัยชนะ",
  "ELDER DRUID": "อาวุโสแห่งพงไพร ควบคุมรากพฤกษาและวัฏจักรแห่งชีวิตระดับสูง",
  "NATURE WARDEN": "ผู้คุ้มครองไพร พลังโจมตีแห่งธรรมชาติที่รุนแรงราวกับภัยพิบัติ",
  "SHADOW LORD": "จ้าวแห่งเงา ราชาผู้อยู่เหนือมิติแห่งความมืดและจารชนทั้งปวง",
  PHANTOM: "ภูตพราย ไร้ตัวตน เคลื่อนไหวดุจวิญญาณที่คอยตามหลอกหลอนศัตรู",
  "BLADE MASTER": "ปรมาจารย์ดาบ บรรลุวิถีดาบพันเล่ม โจมตีรวดเร็วจนมองไม่ทัน",
  "SWORD SAINT": "เซียนดาบ จิตวิญญาณและดาบรวมเป็นหนึ่ง โจมตีทุกรูปแบบอย่างสมบูรณ์แบบ",
}

const TIER_COLORS: Record<string, string> = {
  BASE: "text-blue-400 border-blue-400/30 bg-blue-500/10",
  ADVANCE: "text-purple-400 border-purple-400/30 bg-purple-500/10",
  MASTER: "text-amber-400 border-amber-400/30 bg-amber-500/10",
}

function getEmblemPath(className: string, currentTier: string): string {
  const normalized = className.toLowerCase().replace(/\s+/g, "_");
  const prefix = currentTier === "BASE" ? "base" : (currentTier === "ADVANCE" ? "adv" : "master");
  return `/assets/jobs/emblems/${prefix}_${normalized}.png`;
}

export function JobSelectionModal({
  studentId,
  level,
  jobClass,
  jobTier,
  advanceClass,
  onClose,
  onJobSelected,
}: JobSelectionModalProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageError, setImageError] = useState<Record<string, boolean>>({})

  const isBaseSelection = !jobClass
  const options = useMemo(() => getOptions(jobClass, jobTier, advanceClass), [jobClass, jobTier, advanceClass])
  const title = getModalTitle(level, jobClass, jobTier)
  
  const currentTier: string = isBaseSelection ? "BASE" : (jobTier === "BASE" ? "ADVANCE" : "MASTER")

  const selectedClassDef = useMemo(() => {
    if (!selected) return null;
    return getMergedClassDef(selected);
  }, [selected]);

  const newSkills = useMemo(() => {
    if (!selectedClassDef) return [];
    if (isBaseSelection) return selectedClassDef.skills;
    const minLevel = currentTier === "ADVANCE" ? 20 : 50;
    return selectedClassDef.skills.filter(s => s.unlockLevel >= minLevel);
  }, [selectedClassDef, isBaseSelection, currentTier]);

  async function handleConfirm() {
    if (!selected) return
    setLoading(true)
    setError(null)

    try {
      const endpoint = isBaseSelection
        ? `/api/student/${studentId}/job/select`
        : `/api/student/${studentId}/job/advance`

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isBaseSelection ? { jobClass: selected } : { advanceClass: selected }
        ),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to select job class")
      }

      onJobSelected()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-4xl p-0 overflow-hidden outline-none">
        <div className="flex h-[550px]">
          {/* Left Panel: Options List */}
          <div className="w-1/2 border-r border-slate-800 bg-slate-900/50 p-6">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={cn("px-2 py-0 text-[10px] font-bold uppercase tracking-wider", TIER_COLORS[currentTier])}>
                  {currentTier} Selection
                </Badge>
              </div>
              <DialogTitle className="text-2xl font-black text-white tracking-tight">{title}</DialogTitle>
              {jobClass && (
                <p className="text-xs text-slate-500 font-medium">
                  Current: <span className="text-slate-300">{jobClass}</span>
                  {advanceClass && <span className="text-slate-300"> → {advanceClass}</span>}
                </p>
              )}
            </DialogHeader>

            <ScrollArea className="h-[380px] pr-4">
              <div className="space-y-3">
                {options.map((cls) => (
                  <motion.div
                    key={cls}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      onClick={() => setSelected(cls)}
                      className={cn(
                        "group relative cursor-pointer p-4 border-2 transition-all duration-300 overflow-hidden",
                        selected === cls
                          ? "border-amber-500/50 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                          : "border-slate-800 bg-slate-900 hover:border-slate-700"
                      )}
                    >
                      {selected === cls && (
                        <motion.div 
                          layoutId="active-bg"
                          className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none"
                        />
                      )}
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all overflow-hidden",
                          selected === cls ? "bg-amber-500 text-slate-950 scale-110 shadow-lg" : "bg-slate-800 text-slate-400"
                        )}>
                          {!imageError[cls] ? (
                            <img 
                              src={getEmblemPath(cls, currentTier)} 
                              alt={cls} 
                              className="w-full h-full object-cover"
                              onError={() => setImageError(prev => ({ ...prev, [cls]: true }))}
                            />
                          ) : (
                            CLASS_ICONS[cls] ?? "⚔️"
                          )}
                        </div>
                        <div className="flex-1">
                          <div className={cn("font-bold text-lg leading-tight transition-colors", selected === cls ? "text-amber-400" : "text-white")}>
                            {cls}
                          </div>
                          <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-0.5">
                            {CLASS_DESCRIPTIONS[cls] ? "Available" : "No Description"}
                          </div>
                        </div>
                        {selected === cls && (
                          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                          </motion.div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel: Content Preview */}
          <div className="w-1/2 bg-slate-950 p-8 flex flex-col items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(51,65,85,0.15),transparent)] pointer-events-none" />
             
             <AnimatePresence mode="wait">
               {selected ? (
                 <motion.div
                   key={selected}
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   className="w-full flex flex-col items-center z-10"
                 >
                   <div className="w-32 h-32 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-5xl mb-6 shadow-2xl relative overflow-hidden">
                      <div className="absolute inset-0 bg-amber-500/10 blur-2xl rounded-full" />
                      {!imageError[selected] ? (
                        <img 
                          src={getEmblemPath(selected, currentTier)} 
                          alt={selected} 
                          className="w-full h-full object-cover scale-110"
                          onError={() => setImageError(prev => ({ ...prev, [selected]: true }))}
                        />
                      ) : (
                        CLASS_ICONS[selected]
                      )}
                   </div>
                   
                   <h3 className="text-3xl font-black text-white mb-2 tracking-tight uppercase">
                     {selected}
                   </h3>
                   
                   <p className="text-center text-slate-400 text-sm mb-8 px-4 leading-relaxed font-medium">
                     {CLASS_DESCRIPTIONS[selected] || "ข้อมูลอาชีพยังไม่พร้อมแสดงผลในขณะนี้"}
                   </p>

                   {/* Skills Preview */}
                   <div className="w-full space-y-4">
                     <div className="flex items-center gap-2 mb-2">
                        <div className="h-px flex-1 bg-slate-800" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Unlocks Skills</span>
                        <div className="h-px flex-1 bg-slate-800" />
                     </div>
                     
                     <div className="grid grid-cols-1 gap-2">
                        {newSkills.length > 0 ? (
                          newSkills.slice(0, 3).map(skill => (
                            <div key={skill.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
                               <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                                  {skill.icon ? (
                                    <img src={skill.icon} alt={skill.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-xs">?</span>
                                  )}
                                </div>
                                <div>
                                   <div className="text-xs font-bold text-white leading-none mb-1">{skill.name}</div>
                                   <div className="text-[10px] text-slate-500 line-clamp-1">{skill.description}</div>
                                </div>
                                <Badge variant="outline" className="ml-auto text-[9px] h-5 px-1.5 border-amber-500/30 text-amber-500">
                                  Lv.{skill.unlockLevel}
                                </Badge>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-[10px] text-slate-600 italic py-4">
                            No immediate skill unlocks
                          </div>
                        )}
                     </div>
                   </div>

                   <div className="mt-auto w-full pt-8 flex gap-3">
                      <Button 
                        onClick={onClose} 
                        className="flex-1 bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 font-bold"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="flex-[2] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black tracking-wide shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all hover:scale-[1.02]"
                      >
                        {loading ? "PROCEEDING..." : `BECOME ${selected}`}
                      </Button>
                   </div>
                 </motion.div>
               ) : (
                 <div className="text-center">
                   <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-700 mb-4 mx-auto">
                     ?
                   </div>
                   <p className="text-slate-600 text-sm font-medium italic">Select a path to preview details</p>
                 </div>
               )}
             </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function getModalTitle(level: number, jobClass: string | null, jobTier: string): string {
  if (!jobClass) return "Choose Your Path"
  if (jobTier === "BASE" && level >= 20) return "Class Advancement"
  if (jobTier === "ADVANCE" && level >= 50) return "Path Master"
  return "Job Selection"
}

function getOptions(jobClass: string | null, jobTier: string, advanceClass: string | null): string[] {
  if (!jobClass) return BASE_CLASSES
  if (jobTier === "BASE") return ADVANCE_CLASS_OPTIONS[jobClass] ?? []
  if (jobTier === "ADVANCE" && advanceClass) return MASTER_CLASS_OPTIONS[advanceClass] ?? []
  return []
}
