"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { PLUS_PLANS } from "@/constants/pricing"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, Sparkles, Rocket, Zap, ShieldCheck } from "lucide-react"
import { motion } from "framer-motion"
import { PageBackLink } from "@/components/ui/page-back-link"

export default function UpgradePage() {
    const { data: session, update } = useSession()
    const currentPlan = session?.user?.plan ?? "FREE"
    const [loading, setLoading] = useState<string | null>(null)

    const handleUpgrade = async (planId: string) => {
        if (planId === "FREE") return
        setLoading(planId)
        try {
            const res = await fetch("/api/user/upgrade", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: planId })
            })
            
            if (res.ok) {
                // Success: Update session and redirect
                await update() 
                alert("ยินดีด้วย! คุณได้รับการอัปเกรดเป็น GameEdu Plus เรียบร้อยแล้ว 🎉")
                window.location.href = "/dashboard"
            } else {
                throw new Error("Failed to upgrade")
            }
        } catch {
            alert("เกิดข้อผิดพลาดในการจำลองการอัปเกรด")
        } finally {
            setLoading(planId)
            setLoading(null)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 py-20 px-6">
            <div className="container max-w-6xl mx-auto space-y-16">
                <PageBackLink href="/dashboard" label="แดชบอร์ด" />
                {/* Header */}
                <div className="text-center space-y-4 max-w-2xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-black uppercase tracking-widest"
                    >
                        <Sparkles className="w-4 h-4" /> GameEdu Plus
                    </motion.div>
                    <h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-none">
                        ยกระดับการสอนของคุณ <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">ให้เป็นระดับโปร</span>
                    </h1>
                    <p className="text-slate-500 text-lg font-medium">
                        ปลดล็อคเครื่องมือช่วยสอนที่เหนือชั้น และสร้างประสบการณ์การเรียนรู้ที่นักเรียนจะไม่มีวันลืม
                    </p>
                </div>

                {/* Pricing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {PLUS_PLANS.map((plan, index) => (
                        <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className={`relative h-full border-0 shadow-2xl rounded-[3rem] overflow-hidden flex flex-col ${plan.highlight ? 'ring-4 ring-indigo-600 ring-offset-8 scale-105 z-10' : 'bg-white'}`}>
                                {plan.highlight && (
                                    <div className="absolute top-0 right-0 left-0 bg-indigo-600 text-white text-center py-2 text-xs font-black uppercase tracking-widest">
                                        แผนที่คุ้มค่าที่สุด
                                    </div>
                                )}
                                
                                <CardHeader className={`p-10 ${plan.highlight ? 'pt-12' : ''}`}>
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${
                                        plan.color === 'indigo' ? 'bg-indigo-600 text-white' : 
                                        plan.color === 'emerald' ? 'bg-emerald-500 text-white' : 
                                        'bg-slate-100 text-slate-500'
                                    }`}>
                                        {plan.id === 'FREE' ? <Zap className="w-8 h-8" /> : 
                                         plan.id === 'PLUS' ? <Rocket className="w-8 h-8" /> : 
                                         <ShieldCheck className="w-8 h-8" />}
                                    </div>
                                    <CardTitle className="text-3xl font-black text-slate-900">{plan.name}</CardTitle>
                                    <CardDescription className="text-slate-400 font-bold text-lg">{plan.description}</CardDescription>
                                </CardHeader>

                                <CardContent className="p-10 pt-0 flex-1 flex flex-col">
                                    <div className="flex items-baseline gap-1 mb-8">
                                        <span className="text-5xl font-black text-slate-900">฿{plan.price}</span>
                                        {plan.unit && <span className="text-slate-400 font-bold">/{plan.unit}</span>}
                                    </div>

                                    <div className="space-y-4 mb-10 flex-1">
                                        {plan.features.map((feature, fIndex) => (
                                            <div key={fIndex} className="flex items-start gap-3">
                                                <div className="mt-1 w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                                                    <Check className="w-3 h-3 text-emerald-600" />
                                                </div>
                                                <span className="text-slate-600 font-bold">{feature}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <Button
                                        onClick={() => handleUpgrade(plan.id)}
                                        disabled={currentPlan === plan.id || loading === plan.id}
                                        className={`w-full h-16 rounded-2xl text-lg font-black transition-all hover:scale-[1.02] active:scale-[0.98] ${
                                            currentPlan === plan.id ? 'bg-slate-100 text-slate-400 cursor-default' :
                                            plan.highlight ? 'bg-indigo-600 hover:bg-slate-900 text-white shadow-xl shadow-indigo-200' :
                                            'bg-slate-900 hover:bg-black text-white'
                                        }`}
                                    >
                                        {loading === plan.id ? (
                                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            plan.buttonText
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Comparison Help */}
                <div className="text-center">
                    <p className="text-slate-400 font-medium">
                        ต้องการแผนสำหรับโรงเรียนหรือทีมครูขนาดใหญ่? <a href="#" className="text-indigo-600 font-black hover:underline ml-1">ดาวน์โหลดใบเสนอราคา</a>
                    </p>
                </div>
            </div>
        </div>
    )
}
