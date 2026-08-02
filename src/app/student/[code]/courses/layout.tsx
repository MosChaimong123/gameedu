import { redirect } from "next/navigation"
import { isCoursesUiEnabled } from "@/lib/courses-ui-enabled"

/** คอร์สถูกซ่อนอยู่ — นักเรียนที่เปิดลิงก์เก่าให้กลับไปหน้าแดชบอร์ดของตัวเอง */
export default async function StudentCoursesLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ code: string }>
}) {
    const { code } = await params
    if (!isCoursesUiEnabled()) redirect(`/student/${encodeURIComponent(code)}`)
    return <>{children}</>
}
