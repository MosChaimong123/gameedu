import Link from "next/link"
import SignupWizard from "./signup-wizard"
import { ArrowLeft } from "lucide-react"

export default function RegisterPage() {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4 relative">
            <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-purple-600 transition-colors font-bold">
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Home</span>
            </Link>
            <div className="w-full max-w-xl rounded-xl bg-white p-8 shadow-xl ring-1 ring-slate-900/5">
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-extrabold tracking-tight text-purple-600">GameEdu</h1>
                    <p className="mt-2 text-sm text-slate-500">Create an account to get started.</p>
                </div>

                <SignupWizard />

                <div className="mt-6 text-center text-sm">
                    <span className="text-slate-500">Already have an account? </span>
                    <Link href="/login" className="font-semibold text-purple-600 hover:text-purple-500">
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    )
}
