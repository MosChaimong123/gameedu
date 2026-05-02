"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, GraduationCap, ChevronRight, CheckCircle2, Loader2, ArrowLeft, Eye, EyeOff, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { getLocalizedErrorMessageFromResponse, tryLocalizeFetchNetworkFailureMessage } from "@/lib/ui-error-messages"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useLanguage } from "@/components/providers/language-provider"

const MONTH_KEYS = [
    "monthJanuary",
    "monthFebruary",
    "monthMarch",
    "monthApril",
    "monthMay",
    "monthJune",
    "monthJuly",
    "monthAugust",
    "monthSeptember",
    "monthOctober",
    "monthNovember",
    "monthDecember",
] as const

type Role = "STUDENT" | "TEACHER"
type RoleCardProps = {
    icon: React.ReactNode
    title: string
    description: string
    selected: boolean
    onClick: () => void
}

export default function SignupWizard() {
    const router = useRouter()
    const { language, t } = useLanguage()
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [role, setRole] = useState<Role | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [showPassword, setShowPassword] = useState(false)

    const [dob, setDob] = useState({
        day: "",
        month: "",
        year: "",
    })

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        school: "",
        email: "",
        password: "",
    })

    const months = useMemo(() => MONTH_KEYS.map((k) => t(k)), [t])
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
            setError(t("signupErrDobIncomplete"))
            return
        }

        const birthDate = new Date(parseInt(dob.year, 10), parseInt(dob.month, 10) - 1, parseInt(dob.day, 10))
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const m = today.getMonth() - birthDate.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--
        }

        if (role === "STUDENT" && (age < 10 || age > 18)) {
            setError(t("signupErrAgeStudent"))
            return
        }

        if (role === "TEACHER" && age < 20) {
            setError(t("signupErrAgeTeacher"))
            return
        }

        setStep(3)
    }

    const onRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        if (!role) {
            setError(t("signupErrRoleMissing"))
            return
        }
        setIsLoading(true)

        try {
            const emailPrefix = formData.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "")
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
                    role,
                    school: formData.school,
                }),
            })

            if (!res.ok) {
                const message = await getLocalizedErrorMessageFromResponse(
                    res,
                    "registerErrorFailed",
                    t,
                    language,
                    { overrideTranslationKeys: { INVALID_PAYLOAD: "registerErrorInvalidPayload" } }
                )
                throw new Error(message)
            }

            router.push("/login?registered=true")
        } catch (err: unknown) {
            const raw = err instanceof Error ? err.message : null
            const net = tryLocalizeFetchNetworkFailureMessage(raw, t)
            setError(net ?? (err instanceof Error ? err.message : t("registerErrorFailed")))
        } finally {
            setIsLoading(false)
        }
    }

    const handleGoogleLogin = () => {
        setIsLoading(true)
        signIn("google", { callbackUrl: "/dashboard" })
    }

    const yearLabel = language === "th" ? t("signupLabelYearBe") : t("signupLabelYearCe")

    return (
        <div className="w-full transition-all">
            {step === 1 && (
                <div className="space-y-6 duration-500 animate-in fade-in slide-in-from-bottom-4">
                    <div className="space-y-2 text-center">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-800">{t("signupWhoAreYou")}</h2>
                        <p className="text-slate-500">{t("signupChooseRoleHint")}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <RoleCard
                            icon={<GraduationCap className="mb-3 h-10 w-10 text-emerald-500" />}
                            title={t("signupRoleStudent")}
                            description={t("signupRoleStudentDesc")}
                            selected={role === "STUDENT"}
                            onClick={() => handleRoleSelect("STUDENT")}
                        />
                        <RoleCard
                            icon={<User className="mb-3 h-10 w-10 text-purple-500" />}
                            title={t("signupRoleTeacher")}
                            description={t("signupRoleTeacherDesc")}
                            selected={role === "TEACHER"}
                            onClick={() => handleRoleSelect("TEACHER")}
                        />
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 duration-500 animate-in fade-in slide-in-from-right-8">
                    <div className="mb-2 flex items-center">
                        <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="p-0 hover:bg-transparent">
                            <ArrowLeft className="mr-1 h-4 w-4" /> {t("signupBack")}
                        </Button>
                    </div>

                    <div className="flex flex-col items-center">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-800">{t("signupDobTitle")}</h2>
                        <p className="text-slate-500">{t("signupDobSubtitle")}</p>
                    </div>

                    <form onSubmit={handleAgeSubmit} className="mt-4 w-full space-y-6">
                        <div className="flex w-full justify-center gap-2">
                            <div className="w-24 space-y-1">
                                <Label className="mb-1 block text-center text-xs">{t("signupLabelDay")}</Label>
                                <Select value={dob.day} onValueChange={(val) => setDob({ ...dob, day: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("signupPlaceholderDay")} />
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

                            <div className="w-32 space-y-1">
                                <Label className="mb-1 block text-center text-xs">{t("signupLabelMonth")}</Label>
                                <Select value={dob.month} onValueChange={(val) => setDob({ ...dob, month: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("signupPlaceholderMonth")} />
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

                            <div className="w-28 space-y-1">
                                <Label className="mb-1 block text-center text-xs">{yearLabel}</Label>
                                <Select value={dob.year} onValueChange={(val) => setDob({ ...dob, year: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("signupPlaceholderYear")} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {years.map((y) => (
                                            <SelectItem key={y} value={y.toString()}>
                                                {language === "th" ? y + 543 : y}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-500">{error}</div>
                        )}

                        <Button className="h-12 w-full bg-emerald-600 text-lg hover:bg-emerald-700" type="submit">
                            {t("signupNext")} <ChevronRight className="ml-2 h-5 w-5" />
                        </Button>
                    </form>
                </div>
            )}

            {step === 3 && (
                <form onSubmit={onRegister} className="space-y-4 duration-500 animate-in fade-in slide-in-from-right-8">
                    <div className="mb-4 flex items-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStep(role === "STUDENT" ? 2 : 1)}
                            type="button"
                            className="p-0 hover:bg-transparent"
                        >
                            <ArrowLeft className="mr-1 h-4 w-4" /> {t("signupBack")}
                        </Button>
                        <div className="ml-auto text-sm font-medium text-slate-500">
                            {t("signupRegisteringAs")}{" "}
                            <span className="font-bold text-purple-600">
                                {role === "STUDENT" ? t("signupRoleStudent") : t("signupRoleTeacher")}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">{t("signupLabelFirstName")}</Label>
                            <Input
                                id="firstName"
                                placeholder={t("signupPlaceholderFirstName")}
                                required
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">{t("signupLabelLastName")}</Label>
                            <Input
                                id="lastName"
                                placeholder={t("signupPlaceholderLastName")}
                                required
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            />
                        </div>
                    </div>

                    {role === "TEACHER" && (
                        <div className="space-y-2">
                            <Label htmlFor="school">{t("signupLabelSchool")}</Label>
                            <Input
                                id="school"
                                placeholder={t("signupPlaceholderSchool")}
                                required
                                value={formData.school}
                                onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email">{t("registerLabelEmail")}</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder={t("signupPlaceholderEmail")}
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">{t("registerLabelPassword")}</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder={t("signupPlaceholderPassword")}
                                required
                                minLength={6}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((p) => !p)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <Button
                        className="h-11 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 font-bold text-white shadow-md hover:from-indigo-700 hover:to-purple-700"
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t("signupSubmit")}
                    </Button>

                    <p className="text-center text-xs font-medium leading-5 text-slate-500">
                        {t("signupLegalPrefix")}{" "}
                        <Link href="/terms" className="font-bold text-indigo-600 hover:text-indigo-800">
                            {t("signupLegalTerms")}
                        </Link>{" "}
                        {t("signupLegalAnd")}{" "}
                        <Link href="/privacy" className="font-bold text-indigo-600 hover:text-indigo-800">
                            {t("signupLegalPrivacy")}
                        </Link>
                        {t("signupLegalSuffix")}
                    </p>

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-slate-500">{t("signupOrContinueWith")}</span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        type="button"
                        disabled={isLoading}
                        onClick={handleGoogleLogin}
                        className="h-11 w-full gap-3 rounded-xl border-2 border-slate-200 font-semibold hover:border-indigo-300 hover:bg-indigo-50"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 488 512" xmlns="http://www.w3.org/2000/svg">
                            <path
                                fill="#4285F4"
                                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                            />
                        </svg>
                        {t("signupWithGoogle")}
                    </Button>
                </form>
            )}
        </div>
    )
}

function RoleCard({ icon, title, description, selected, onClick }: RoleCardProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-200 hover:shadow-md",
                selected
                    ? "border-purple-600 bg-purple-50 ring-1 ring-purple-600"
                    : "border-slate-200 bg-white hover:border-purple-300"
            )}
        >
            {selected && (
                <div className="absolute right-3 top-3 text-purple-600">
                    <CheckCircle2 className="h-6 w-6 fill-purple-100" />
                </div>
            )}
            <div className="flex flex-col items-center text-center">
                {icon}
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
        </div>
    )
}
