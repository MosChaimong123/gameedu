"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { User, GraduationCap, ChevronRight, CheckCircle2, Loader2, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

type Role = "STUDENT" | "TEACHER"

export default function SignupWizard() {
    const router = useRouter()
    const [step, setStep] = useState<1 | 2 | 3>(1) // 1: Role, 2: Age (Student), 3: Form
    const [role, setRole] = useState<Role | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    // Date of Birth State
    const [dob, setDob] = useState({
        day: "",
        month: "",
        year: ""
    })

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        school: "",
        email: "",
        password: "",
    })

    // Helper arrays
    const months = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ]
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 100 }, (_, i) => currentYear - i)
    const days = Array.from({ length: 31 }, (_, i) => i + 1)

    const handleRoleSelect = (selectedRole: Role) => {
        setRole(selectedRole)
        setStep(2)
    }

    const handleAgeSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!dob.day || !dob.month || !dob.year) {
            setError("กรุณากรอกวันเกิดให้ครบถ้วน")
            return
        }

        const birthDate = new Date(parseInt(dob.year), parseInt(dob.month) - 1, parseInt(dob.day))
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const m = today.getMonth() - birthDate.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--
        }

        if (role === "STUDENT" && (age < 10 || age > 18)) {
            setError("ขออภัย สำหรับนักเรียนต้องมีอายุระหว่าง 10 - 18 ปีเท่านั้น")
            return
        }

        if (role === "TEACHER" && age < 20) {
            setError("ขออภัย สำหรับคุณครูต้องมีอายุ 20 ปีขึ้นไป")
            return
        }

        setStep(3)
    }

    const onRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setIsLoading(true)

        try {
            // Auto-generate username: email prefix + random 4 digits
            const emailPrefix = formData.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, "")
            const randomSuffix = Math.floor(1000 + Math.random() * 9000)
            const generatedUsername = `${emailPrefix}${randomSuffix}`.substring(0, 20)

            const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`

            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: generatedUsername,
                    email: formData.email.trim(),
                    password: formData.password,
                    name: fullName,
                    role: role,
                    school: formData.school
                })
            })

            if (!res.ok) {
                const msg = await res.text()
                throw new Error(msg)
            }

            // Success
            router.push("/login?registered=true")
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleGoogleLogin = () => {
        setIsLoading(true)
        signIn("google", { callbackUrl: "/dashboard" })
    }

    return (
        <div className="w-full transition-all">
            {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-800">คุณคือใคร?</h2>
                        <p className="text-slate-500">เลือกประเภทบัญชีของคุณเพื่อเริ่มต้น</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <RoleCard
                            icon={<GraduationCap className="w-10 h-10 mb-3 text-emerald-500" />}
                            title="นักเรียน"
                            description="เล่นเกม, เก็บสถิติ, และปลดล็อค Blooks"
                            selected={role === "STUDENT"}
                            onClick={() => handleRoleSelect("STUDENT")}
                        />
                        <RoleCard
                            icon={<User className="w-10 h-10 mb-3 text-purple-500" />}
                            title="คุณครู"
                            description="โฮสต์เกม, สร้างชุดคำถาม, และดูรายงานผล"
                            selected={role === "TEACHER"}
                            onClick={() => handleRoleSelect("TEACHER")}
                        />
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                    <div className="flex items-center mb-2">
                        <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="p-0 hover:bg-transparent">
                            <ArrowLeft className="w-4 h-4 mr-1" /> ย้อนกลับ
                        </Button>
                    </div>

                    <div className="flex flex-col items-center">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-800">วันเกิดของคุณคือเมื่อไหร่?</h2>
                        <p className="text-slate-500">เราจำเป็นต้องตรวจสอบอายุของคุณตามข้อกำหนด</p>
                    </div>

                    <form onSubmit={handleAgeSubmit} className="space-y-6 mt-4 w-full">
                        <div className="flex gap-2 justify-center w-full">
                            <div className="space-y-1 w-24">
                                <Label className="text-xs text-center block mb-1">วัน</Label>
                                <Select
                                    value={dob.day}
                                    onValueChange={(val) => setDob({ ...dob, day: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="วัน" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {days.map((d) => (
                                            <SelectItem key={d} value={d.toString()}>
                                                {d}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1 w-32">
                                <Label className="text-xs text-center block mb-1">เดือน</Label>
                                <Select
                                    value={dob.month}
                                    onValueChange={(val) => setDob({ ...dob, month: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="เดือน" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {months.map((m, i) => (
                                            <SelectItem key={m} value={(i + 1).toString()}>
                                                {m}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1 w-28">
                                <Label className="text-xs text-center block mb-1">ปี (พ.ศ.)</Label>
                                <Select
                                    value={dob.year}
                                    onValueChange={(val) => setDob({ ...dob, year: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="ปี" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {years.map((y) => (
                                            <SelectItem key={y} value={y.toString()}>
                                                {y + 543}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 text-red-500 text-sm font-medium text-center">
                                {error}
                            </div>
                        )}

                        <Button className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700" type="submit">
                            ถัดไป <ChevronRight className="ml-2 w-5 h-5" />
                        </Button>
                    </form>
                </div>
            )}

            {step === 3 && (
                <form onSubmit={onRegister} className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-500">
                    <div className="flex items-center mb-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStep(role === "STUDENT" ? 2 : 1)}
                            type="button"
                            className="p-0 hover:bg-transparent"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" /> ย้อนกลับ
                        </Button>
                        <div className="ml-auto text-sm font-medium text-slate-500">
                            สมัครสมาชิกในฐานะ <span className="text-purple-600 font-bold">{role === "STUDENT" ? "นักเรียน" : "ครู"}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">ชื่อ</Label>
                            <Input
                                id="firstName"
                                placeholder="สมชาย"
                                required
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">นามสกุล</Label>
                            <Input
                                id="lastName"
                                placeholder="ใจดี"
                                required
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            />
                        </div>
                    </div>

                    {role === "TEACHER" && (
                        <div className="space-y-2">
                            <Label htmlFor="school">โรงเรียน</Label>
                            <Input
                                id="school"
                                placeholder="ชื่อโรงเรียน"
                                required
                                value={formData.school}
                                onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email">อีเมล</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@school.com"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">รหัสผ่าน</Label>
                        <Input
                            id="password"
                            type="password"
                            required
                            minLength={6}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-500 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <Button className="w-full h-12 text-lg bg-purple-600 hover:bg-purple-700" type="submit" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "สมัครสมาชิก"}
                    </Button>

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-slate-500">หรือดำเนินการต่อด้วย</span>
                        </div>
                    </div>

                    <Button variant="outline" type="button" disabled={isLoading} onClick={handleGoogleLogin} className="w-full h-12">
                        <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                        </svg>
                        สมัครด้วย Google
                    </Button>
                </form>
            )}
        </div>
    )
}

function RoleCard({ icon, title, description, selected, onClick }: any) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "cursor-pointer relative p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-md",
                selected
                    ? "border-purple-600 bg-purple-50 ring-1 ring-purple-600"
                    : "border-slate-200 bg-white hover:border-purple-300"
            )}
        >
            {selected && (
                <div className="absolute top-3 right-3 text-purple-600">
                    <CheckCircle2 className="w-6 h-6 fill-purple-100" />
                </div>
            )}
            <div className="flex flex-col items-center text-center">
                {icon}
                <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
                <p className="text-sm text-slate-500 mt-1">{description}</p>
            </div>
        </div>
    )
}
