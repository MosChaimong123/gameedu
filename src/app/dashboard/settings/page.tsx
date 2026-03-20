"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useLanguage } from "@/components/providers/language-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
    Settings, 
    Volume2, 
    Languages, 
    Shield, 
    Save,
    Bell,
    Smartphone,
    Globe,
    Sparkles
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function SettingsPage() {
    const { data: session, update } = useSession()
    const { t, language, setLanguage } = useLanguage()
    
    const [loading, setLoading] = useState(false)
    const [saved, setSaved] = useState(false)
    const [hasInitialized, setHasInitialized] = useState(false)

    // Local state for settings
    const [settings, setSettings] = useState({
        sfxEnabled: true,
        bgmEnabled: true,
        language: "th",
        notifications: true,
        highPerformance: false
    })

    useEffect(() => {
        // Only initialize once from session
        if (session?.user && !hasInitialized) {
            // @ts-ignore
            if (session.user.settings) {
                try {
                    // @ts-ignore
                    const userSettings = typeof session.user.settings === 'string' 
                        // @ts-ignore
                        ? JSON.parse(session.user.settings) 
                        // @ts-ignore
                        : session.user.settings
                    setSettings(prev => ({ ...prev, ...userSettings }))
                } catch (e) {
                    console.error("Failed to parse settings", e)
                }
            }
            setHasInitialized(true)
        }
    }, [session, hasInitialized])

    const handleSave = async () => {
        setLoading(true)
        setSaved(false)
        
        try {
            const res = await fetch("/api/user/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings)
            })
            
            if (res.ok) {
                setSaved(true)
                await update({ settings })
                setTimeout(() => setSaved(false), 3000)
            }
        } catch (error) {
            console.error("Save error", error)
        } finally {
            setLoading(false)
        }
    }

    const updateSetting = (key: string, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }))
        
        if (key === "language") setLanguage(value)
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 pb-20">
            <div className="container max-w-4xl py-12 px-6 space-y-10 mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-10">
                    <div className="space-y-2">
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-200 mb-4"
                        >
                            <Settings className="w-8 h-8 animate-pulse" />
                        </motion.div>
                        <h1 className="text-4xl font-black tracking-tight text-foreground leading-none">
                            {t("settings") || "การตั้งค่า"}
                        </h1>
                        <p className="text-muted-foreground text-lg font-medium max-w-md leading-relaxed">
                            {t("settingsDesc") || "ปรับแต่งห้องเรียนของคุณให้เข้ากับสไตล์การเรียนรู้ที่ใช่"}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <AnimatePresence mode="wait">
                            {saved ? (
                                <motion.div
                                    key="saved"
                                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black border border-emerald-100 shadow-sm"
                                >
                                    <AnimatePresence>
                                        <motion.div animate={{ rotate: [0, 10, -10, 0] }}>✅</motion.div>
                                    </AnimatePresence>
                                    {t("saved") || "บันทึกสำเร็จ"}
                                </motion.div>
                            ) : (
                                <Button 
                                    key="save"
                                    onClick={handleSave} 
                                    disabled={loading}
                                    className="h-14 px-10 rounded-2xl bg-slate-900 hover:bg-black text-white font-black shadow-2xl transition-all hover:scale-105 active:scale-95 gap-3 border-0 group"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                            {t("saveChanges") || "บันทึกข้อมูล"}
                                        </>
                                    )}
                                </Button>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <Tabs defaultValue="language" className="w-full space-y-10">
                    <div className="flex justify-center">
                        <TabsList className="bg-white p-2 rounded-3xl h-16 border border-slate-200 shadow-xl shadow-slate-200/50 gap-2">
                            <TabsTrigger value="language" className="rounded-2xl px-8 font-black data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all gap-2">
                                <Languages className="w-4 h-4" /> {t("language") || "ภาษา"}
                            </TabsTrigger>
                            <TabsTrigger value="audio" className="rounded-2xl px-8 font-black data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all gap-2">
                                <Volume2 className="w-4 h-4" /> {t("audio") || "เสียง"}
                            </TabsTrigger>
                        </TabsList>
                    </div>



                    <TabsContent value="language" className="animate-in fade-in zoom-in-95 duration-500 focus-visible:outline-none">
                        <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[3rem] bg-card p-2">
                            <CardHeader className="p-10 pb-4">
                                <CardTitle className="text-3xl font-black flex items-center gap-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                        <Globe className="w-8 h-8" />
                                    </div>
                                    ภาษาที่ต้องการใช้งาน
                                </CardTitle>
                                <CardDescription className="text-lg font-medium text-muted-foreground">เปลี่ยนภาษาของระบบทั้งหมดได้ที่นี่</CardDescription>
                            </CardHeader>
                            <CardContent className="p-10 pt-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    {[
                                        { id: 'th', name: 'ภาษาไทย', sub: 'Thai Language', flag: '🇹🇭' },
                                        { id: 'en', name: 'English', sub: 'Global Version', flag: '🇺🇸' }
                                    ].map((lang: any) => (
                                        <motion.button 
                                            key={lang.id}
                                            whileHover={{ y: -5, scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => updateSetting("language", lang.id)}
                                            className={`group p-8 rounded-[2.5rem] border-4 transition-all text-left relative overflow-hidden ${settings.language === lang.id ? 'border-indigo-600 bg-indigo-50/50 shadow-xl shadow-indigo-100' : 'border-slate-100 bg-slate-50 hover:border-indigo-200'}`}
                                        >
                                            <div className="flex flex-col gap-4 relative z-10">
                                                <span className="text-5xl group-hover:scale-110 transition-transform origin-left block">{lang.flag}</span>
                                                <div>
                                                    <h4 className={`font-black text-2xl leading-none ${settings.language === lang.id ? 'text-indigo-600' : 'text-foreground'}`}>{lang.name}</h4>
                                                    <p className="text-sm text-muted-foreground uppercase font-black tracking-widest mt-2">{lang.sub}</p>
                                                </div>
                                            </div>
                                            {settings.language === lang.id && (
                                                <motion.div 
                                                    layoutId="activeLang"
                                                    className="absolute top-6 right-6 w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg"
                                                >
                                                    <AnimatePresence>
                                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>✅</motion.div>
                                                    </AnimatePresence>
                                                </motion.div>
                                            )}
                                        </motion.button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="audio" className="animate-in fade-in zoom-in-95 duration-500 focus-visible:outline-none">
                        <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[3rem] bg-card overflow-hidden">
                            <CardContent className="p-10 space-y-8">
                                <div className="flex items-center justify-between p-8 rounded-[2.5rem] bg-muted border border-border hover:bg-muted/50 transition-all group">
                                    <div className="flex items-center gap-6">
                                        <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-lg shadow-indigo-200 group-hover:rotate-6 transition-transform">
                                            <Volume2 className="w-8 h-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-2xl font-black italic text-foreground leading-none">Sound Effects (SFX)</Label>
                                            <p className="text-sm text-muted-foreground font-black uppercase tracking-widest mt-1">เสียงโต้ตอบในตัวเกม</p>
                                        </div>
                                    </div>
                                    <Switch 
                                        checked={settings.sfxEnabled}
                                        onCheckedChange={(val) => updateSetting("sfxEnabled", val)}
                                        className="scale-125 data-[state=checked]:bg-indigo-600"
                                    />
                                </div>
                                
                                <div className="flex items-center justify-between p-8 rounded-[2.5rem] bg-muted border border-border hover:bg-muted/50 transition-all group">
                                    <div className="flex items-center gap-6">
                                        <div className="p-4 bg-emerald-500 text-white rounded-3xl shadow-lg shadow-emerald-200 group-hover:-rotate-6 transition-transform">
                                            <Globe className="w-8 h-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-2xl font-black italic text-foreground leading-none">Background Music</Label>
                                            <p className="text-sm text-muted-foreground font-black uppercase tracking-widest mt-1">เพลงประกอบบรรยากาศ</p>
                                        </div>
                                    </div>
                                    <Switch 
                                        checked={settings.bgmEnabled}
                                        onCheckedChange={(val) => updateSetting("bgmEnabled", val)}
                                        className="scale-125 data-[state=checked]:bg-emerald-500"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* @ts-ignore */}
                {session?.user?.role === 'ADMIN' && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="pt-10"
                    >
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-indigo-600 rounded-[3.5rem] blur opacity-30"></div>
                            <Card className="relative border-0 shadow-2xl rounded-[3rem] bg-indigo-600 text-white p-2 overflow-hidden">
                                <div className="p-10 space-y-8">
                                    <div className="flex items-center gap-6">
                                        <div className="p-5 bg-white text-indigo-600 rounded-[2rem] shadow-2xl">
                                            <Shield className="w-10 h-10" />
                                        </div>
                                        <div className="space-y-1">
                                            <h2 className="text-4xl font-black italic leading-none">Administrator</h2>
                                            <p className="text-indigo-100 text-lg font-bold">จัดการการตั้งค่าฝั่งเซิร์ฟเวอร์และระบบส่วนกลาง</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                                        <Button variant="secondary" className="h-16 rounded-2xl font-black text-lg shadow-xl hover:scale-105 transition-all">แผงควบคุมสมาชิก</Button>
                                        <Button variant="secondary" className="h-16 rounded-2xl font-black text-lg shadow-xl hover:scale-105 transition-all">สถานะระบบการศึกษา</Button>
                                        <Button className="h-16 rounded-2xl font-black text-lg bg-slate-900 text-white hover:bg-black shadow-xl hover:scale-105 transition-all">โหมดปิดปรับปรุง</Button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    )
}
