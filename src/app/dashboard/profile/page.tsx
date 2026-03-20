"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { useLanguage } from "@/components/providers/language-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { motion } from "framer-motion"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { User, Mail, Shield, Camera, Save, Loader2, CheckCircle2, Upload, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

const DEFAULT_AVATARS = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aiden",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sasha",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Midnight",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Lilly",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Caleb",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo",
]

import { updateProfile } from "@/actions/user-profile"

export default function ProfilePage() {
    const { data: session, update } = useSession()
    const { t } = useLanguage()
    const router = useRouter()
    
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [image, setImage] = useState("")
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [hasInitialized, setHasInitialized] = useState(false)
    const [isPickerOpen, setIsPickerOpen] = useState(false)
 
    useEffect(() => {
        // Only initialize once when session is ready
        if (session?.user && !hasInitialized) {
            setName(session.user.name || "")
            setEmail(session.user.email || "")
            setImage(session.user.image || "")
            setHasInitialized(true)
        }
    }, [session, hasInitialized])
 
    const getTranslation = (key: string, fallback: string) => {
        const val = t(key)
        // If translation is missing or returns the key itself, use fallback
        if (!val || val === key) return fallback
        return val
    }
 
    const handleSave = async (newImage?: string) => {
        const imageToSave = newImage !== undefined ? newImage : image
        
        // Validation: Name cannot be empty
        if (!name.trim()) {
            alert("Name cannot be empty")
            return
        }

        setLoading(true)
        setSuccess(false)
        try {
            console.log("[PROFILE_PAGE] Saving via API fetch...")
            const res = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), image: imageToSave })
            })

            if (res.ok) {
                console.log("[PROFILE_PAGE] Save successful, updating session...")
                setSuccess(true)
                
                // Trigger session refresh
                try {
                    await update({ name: name.trim(), image: imageToSave })
                } catch (e) {
                    console.warn("Client session update error (ignoring):", e)
                }

                setTimeout(() => {
                    window.location.href = "/dashboard/profile?done=" + Date.now()
                }, 1000)
            } else {
                const err = await res.text()
                alert("Error: " + err)
            }
        } catch (error: any) {
            console.error("Error in handleSave:", error)
            alert("Fetch Error: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                const base64String = reader.result as string
                setImage(base64String)
                handleSave(base64String)
            }
            reader.readAsDataURL(file)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">
                        {getTranslation("profileSettings", "ตั้งค่าโปรไฟล์")}
                    </h1>
                    <p className="text-slate-500">{getTranslation("manageProfileDesc", "จัดการข้อมูลส่วนตัวและรูปประจำตัวของคุณ")}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Avatar & Basic Info Card */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="overflow-hidden border-none shadow-xl bg-white/70 backdrop-blur-xl rounded-[2rem]">
                        <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-500" />
                        <CardContent className="relative pt-0 pb-8 flex flex-col items-center">
                            <div className="relative -mt-12 group">
                                <Avatar className="h-24 w-24 border-4 border-white shadow-2xl ring-1 ring-slate-200 bg-white">
                                    <AvatarImage src={image} />
                                    <AvatarFallback className="bg-indigo-100 text-indigo-700 text-2xl font-black">
                                        {name?.[0]?.toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                
                                <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
                                    <DialogTrigger asChild>
                                        <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-white shadow-lg border border-slate-100 flex items-center justify-center text-slate-600 hover:text-indigo-600 transition-colors">
                                            <Camera className="w-4 h-4" />
                                        </button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md rounded-[2rem] border-none shadow-2xl bg-white/90 backdrop-blur-xl">
                                        <DialogHeader>
                                            <DialogTitle className="text-xl font-black text-foreground">Choose Avatar</DialogTitle>
                                            <DialogDescription>Select a cartoon avatar or upload your own image</DialogDescription>
                                        </DialogHeader>
                                        
                                        <div className="grid grid-cols-3 gap-4 mt-4">
                                            {DEFAULT_AVATARS.map((avatarUrl, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        setImage(avatarUrl)
                                                        handleSave(avatarUrl)
                                                    }}
                                                    className={`relative rounded-2xl overflow-hidden aspect-square border-4 transition-all hover:scale-105 active:scale-95 ${image === avatarUrl ? "border-indigo-500 ring-2 ring-indigo-200" : "border-transparent bg-slate-50"}`}
                                                >
                                                    <img src={avatarUrl} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                                                </button>
                                            ))}
                                            
                                            <label className="relative rounded-2xl overflow-hidden aspect-square border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition-all group">
                                                <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500" />
                                                <span className="text-[10px] font-black text-slate-400 mt-1 uppercase group-hover:text-indigo-500">Upload</span>
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept="image/*"
                                                    onChange={handleFileChange}
                                                />
                                            </label>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            
                            <div className="mt-4 text-center">
                                <h2 className="text-xl font-black text-foreground">{name}</h2>
                                <p className="text-sm text-slate-500">{email}</p>
                            </div>

                            <div className="mt-6 w-full pt-6 border-t border-slate-100 space-y-3">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider">บทบาท (Role)</span>
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-black border border-indigo-100 uppercase tracking-tighter">
                                        {/* @ts-ignore */}
                                        {session?.user?.role || "STUDENT"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider">สถานะ (Status)</span>
                                    <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-black border border-green-100 uppercase tracking-tighter">ปกติ (Active)</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Side: Edit Form Component */}
                <div className="lg:col-span-2">
                    <Card className="border-none shadow-xl bg-white/70 backdrop-blur-xl rounded-[2rem] h-full">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-2xl font-black text-foreground flex items-center gap-2">
                                <User className="w-6 h-6 text-indigo-500" />
                                ข้อมูลส่วนตัว (Personal Info)
                            </CardTitle>
                            <CardDescription>Update your name and profile details below</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <User className="w-3 h-3" /> Full Name
                                    </label>
                                    <Input 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="h-12 px-4 rounded-xl border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 font-bold"
                                        placeholder="Enter your name"
                                    />
                                </div>

                                <div className="space-y-2 opacity-60">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Mail className="w-3 h-3" /> Email Address
                                    </label>
                                    <Input 
                                        value={email}
                                        disabled
                                        className="h-12 px-4 rounded-xl bg-slate-50 border-slate-100 font-medium cursor-not-allowed"
                                        placeholder="your.email@example.com"
                                    />
                                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                        <Shield className="w-3 h-3" /> Email cannot be changed for security reasons
                                    </p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                                {success && (
                                    <motion.div 
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center gap-2 text-green-600 font-black text-sm"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Changes Saved!
                                    </motion.div>
                                )}
                                <Button 
                                    onClick={() => handleSave()}
                                    disabled={loading}
                                    className="h-12 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
