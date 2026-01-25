"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { User, GraduationCap, ChevronRight, CheckCircle2, Loader2, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

type Role = "STUDENT" | "TEACHER"

export default function SignupWizard() {
    const router = useRouter()
    const [step, setStep] = useState<1 | 2>(1)
    const [role, setRole] = useState<Role | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
    })

    const onRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setIsLoading(true)

        try {
            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: formData.username.trim(),
                    email: formData.email.trim(),
                    password: formData.password,
                    name: formData.username.trim(),
                    role: role
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

    // Step 1: Role Selection
    if (step === 1) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">Who are you?</h2>
                    <p className="text-slate-500">Select your account type to get started</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <RoleCard
                        icon={<GraduationCap className="w-10 h-10 mb-3 text-emerald-500" />}
                        title="Student"
                        description="Play games, earn stats, and unlock Blooks"
                        selected={role === "STUDENT"}
                        onClick={() => setRole("STUDENT")}
                    />
                    <RoleCard
                        icon={<User className="w-10 h-10 mb-3 text-purple-500" />}
                        title="Teacher"
                        description="Host games, create sets, and track reports"
                        selected={role === "TEACHER"}
                        onClick={() => setRole("TEACHER")}
                    />
                </div>

                <Button
                    className="w-full h-12 text-lg"
                    disabled={!role}
                    onClick={() => setStep(2)}
                >
                    Next <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
            </div>
        )
    }

    // Step 2: Account Details
    return (
        <form onSubmit={onRegister} className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex items-center mb-4">
                <Button variant="ghost" size="sm" onClick={() => setStep(1)} type="button" className="p-0 hover:bg-transparent">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <div className="ml-auto text-sm font-medium text-slate-500">
                    Signing up as <span className="text-purple-600 font-bold">{role}</span>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                    id="username"
                    placeholder="GameEduMaster123"
                    required
                    minLength={3}
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
                <p className="text-xs text-slate-500">This will be your display name in games.</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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
                <Label htmlFor="password">Password</Label>
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
                {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Sign Up"}
            </Button>
        </form>
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
