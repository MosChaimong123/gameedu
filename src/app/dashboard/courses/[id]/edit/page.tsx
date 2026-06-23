import { CourseBuilderClient } from "@/components/courses/course-builder-client"

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return <CourseBuilderClient mode="edit" courseId={id} />
}
