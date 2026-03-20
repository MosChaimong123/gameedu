import LoginForm from "./login-form"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function LoginPage() {
    return (
        <div className="flex min-h-screen w-full">
            {/* ===== Left: Brand Panel ===== */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-12 flex-col justify-between relative overflow-hidden">
                {/* Animated background circles */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-16">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">🎮</div>
                        <span className="text-white font-black text-2xl tracking-tight">GameEdu</span>
                    </div>

                    <h1 className="text-4xl font-black text-white leading-tight mb-4">
                        ยินดีต้อนรับกลับ<br />
                        <span className="text-white/80">สู่ห้องเรียนดิจิทัล</span>
                    </h1>
                    <p className="text-white/70 text-lg leading-relaxed max-w-sm">
                        ระบบจัดการห้องเรียนอัจฉริยะ — ให้รางวัล ติดตามคะแนน และทำให้การเรียนสนุกยิ่งขึ้น
                    </p>
                </div>

                {/* Feature pills */}
                <div className="relative z-10 flex flex-col gap-3">
                    {[
                        { icon: "🏆", text: "ระบบคะแนนและยศ" },
                        { icon: "📊", text: "รายงานผลแบบ real-time" },
                        { icon: "🎮", text: "เกมการเรียนรู้ที่สนุก" },
                    ].map((item: any) => (
                        <div key={item.text} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
                            <span className="text-2xl">{item.icon}</span>
                            <span className="text-white font-semibold">{item.text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ===== Right: Form Panel ===== */}
            <div className="flex flex-1 flex-col items-center justify-center p-8 bg-slate-50 relative">
                <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors text-sm font-semibold">
                    <ArrowLeft className="w-4 h-4" />
                    <span>กลับหน้าแรก</span>
                </Link>

                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center gap-2 mb-8">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-lg">🎮</div>
                        <span className="font-black text-indigo-600 text-xl">GameEdu</span>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-3xl font-black text-slate-800">เข้าสู่ระบบ</h2>
                        <p className="text-slate-500 mt-2">ใส่ข้อมูลบัญชีของคุณเพื่อดำเนินการต่อ</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
                        <LoginForm />
                    </div>

                    <p className="mt-6 text-center text-sm text-slate-500">
                        ยังไม่มีบัญชี?{" "}
                        <Link href="/register" className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
                            สมัครสมาชิกฟรี
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
