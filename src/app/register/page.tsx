import Link from "next/link"
import SignupWizard from "./signup-wizard"
import { PageBackLink } from "@/components/ui/page-back-link"

export default function RegisterPage() {
    return (
        <div className="flex min-h-screen w-full">

            {/* ===== Left: Brand Panel ===== */}
            <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-500 p-12 flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-16">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">🎮</div>
                        <span className="text-white font-black text-2xl tracking-tight">GameEdu</span>
                    </div>

                    <h1 className="text-4xl font-black text-white leading-tight mb-4">
                        เริ่มต้นสร้าง<br />
                        <span className="text-white/80">ห้องเรียนของคุณ</span>
                    </h1>
                    <p className="text-white/70 text-lg leading-relaxed max-w-sm">
                        สมัครฟรี ไม่มีค่าใช้จ่าย — จัดการห้องเรียน ให้คะแนน และสร้างเกมได้ทันที
                    </p>
                </div>

                <div className="relative z-10 space-y-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-xl">⚡</span>
                            <p className="text-white font-bold">ตั้งค่าง่าย ใช้งานได้ทันที</p>
                        </div>
                        <p className="text-white/60 text-sm pl-9">สร้างห้องเรียนและเพิ่มนักเรียนได้ในไม่กี่นาที</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-xl">🔒</span>
                            <p className="text-white font-bold">ปลอดภัยและน่าเชื่อถือ</p>
                        </div>
                        <p className="text-white/60 text-sm pl-9">ข้อมูลนักเรียนปลอดภัย ด้วย bcrypt encryption</p>
                    </div>
                </div>
            </div>

            {/* ===== Right: Form Panel ===== */}
            <div className="flex flex-1 flex-col items-center justify-center p-8 bg-slate-50 relative overflow-y-auto">
                <div className="absolute left-6 top-6">
                    <PageBackLink href="/" label="กลับหน้าแรก" />
                </div>

                <div className="w-full max-w-lg py-8">
                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center gap-2 mb-8">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-lg">🎮</div>
                        <span className="font-black text-indigo-600 text-xl">GameEdu</span>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-3xl font-black text-slate-800">สมัครสมาชิก</h2>
                        <p className="text-slate-500 mt-2">สร้างบัญชีครูเพื่อเริ่มต้นใช้งาน</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
                        <SignupWizard />
                    </div>

                    <p className="mt-6 text-center text-sm text-slate-500">
                        มีบัญชีแล้ว?{" "}
                        <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
                            เข้าสู่ระบบ
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
