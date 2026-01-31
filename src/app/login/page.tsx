import LoginForm from "./login-form"
import Link from "next/link"

import { ArrowLeft } from "lucide-react"

export default function LoginPage() {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4 relative">
            <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-purple-600 transition-colors font-bold">
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Home</span>
            </Link>
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl ring-1 ring-slate-900/5">
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-extrabold tracking-tight text-purple-600">Blooket</h1>
                    <p className="mt-2 text-sm text-slate-500">Welcome back! Please login to continue.</p>
                </div>
                <LoginForm />
                <div className="mt-6 text-center text-sm">
                    <span className="text-slate-500">Don&apos;t have an account? </span>
                    <Link href="/register" className="font-semibold text-purple-600 hover:text-purple-500">
                        Sign Up
                    </Link>
                </div>
            </div>
        </div>
    )
}
