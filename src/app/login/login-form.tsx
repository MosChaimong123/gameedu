"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react"

const formSchema = z.object({
    email: z.string().email("อีเมลไม่ถูกต้อง"),
    password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
})

export default function LoginForm() {
    const [isLoading, setIsLoading] = React.useState(false)
    const [showPassword, setShowPassword] = React.useState(false)
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { email: "", password: "" },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        setErrorMsg(null)
        try {
            const result = await signIn("credentials", {
                email: values.email,
                password: values.password,
                redirect: false,
            })
            if (result?.error || !result?.ok) {
                setErrorMsg("อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่")
            } else {
                // Fetch the session to determine role-based redirect
                const { getSession } = await import("next-auth/react")
                const session = await getSession()
                const role = session?.user?.role
                if (role === "STUDENT") {
                    window.location.href = "/student/home"
                } else if (role === "ADMIN") {
                    window.location.href = "/admin"
                } else {
                    window.location.href = "/dashboard"
                }
            }
        } catch {
            setErrorMsg("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="grid gap-5">
            {/* Error banner */}
            {errorMsg && (
                <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm animate-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700 font-semibold">อีเมล</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="name@example.com"
                                        className="h-11 rounded-xl border-slate-200 focus:border-indigo-400 focus:ring-indigo-400"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700 font-semibold">รหัสผ่าน</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="h-11 rounded-xl border-slate-200 focus:border-indigo-400 focus:ring-indigo-400 pr-10"
                                            {...field}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(p => !p)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button
                        type="submit"
                        className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold shadow-md hover:shadow-lg transition-all"
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        เข้าสู่ระบบ
                    </Button>
                </form>
            </Form>

        </div>
    )
}
