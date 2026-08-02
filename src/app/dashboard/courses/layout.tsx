import { redirect } from "next/navigation"
import { isCoursesUiEnabled } from "@/lib/courses-ui-enabled"

/** คอร์สถูกซ่อนอยู่ — เข้า URL ตรงๆ ให้เด้งกลับไปหน้าบทเรียน */
export default function CoursesLayout({ children }: { children: React.ReactNode }) {
    if (!isCoursesUiEnabled()) redirect("/dashboard/lessons")
    return <>{children}</>
}
