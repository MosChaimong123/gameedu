import { describe, expect, it } from "vitest"
import { buildClassroomCourseCurriculumAnalytics } from "@/lib/courses/classroom-course-curriculum-analytics"

const courseContent = {
    schemaVersion: "course_content_v1" as const,
    title: "Physics Course",
    subject: "ฟิสิกส์",
    modules: [
        {
            id: "module-1",
            title: "Module 1",
            order: 0,
            lessons: [
                { id: "ref-1", lessonId: "lesson-1", title: "ธรรมชาติและพัฒนาการทางฟิสิกส์", order: 0, required: true, unlockRule: { type: "none" as const } },
                { id: "ref-2", lessonId: "lesson-2", title: "การเคลื่อนที่แนวตรง", order: 1, required: false, unlockRule: { type: "previous_lesson_completed" as const } },
            ],
        },
    ],
}

describe("buildClassroomCourseCurriculumAnalytics", () => {
    it("groups lesson completion by curriculum unit and preserves required/optional counts", () => {
        const analytics = buildClassroomCourseCurriculumAnalytics({
            content: courseContent,
            lessons: [
                {
                    id: "lesson-1",
                    title: "ธรรมชาติและพัฒนาการทางฟิสิกส์",
                    subject: "science_technology",
                    content: {
                        schemaVersion: "lesson_content_v2",
                        outline: { title: "ธรรมชาติและพัฒนาการทางฟิสิกส์", topics: [{ id: "topic-1", title: "บทที่ 1", order: 0 }] },
                        topics: [{ id: "topic-1", title: "บทที่ 1", order: 0, contentStatus: "generated", objectives: ["เข้าใจ"], sections: [{ id: "section-1", heading: "หัวข้อ", content: "เนื้อหา" }] }],
                        metadata: {
                            curriculum: {
                                subject: "science_technology",
                                curriculumCode: "basic_education_2551_revised_2560",
                                gradeLevel: "ม.4",
                                unitId: "phy-m4-s1-u01",
                                learningOutcomeIds: ["phy-m4-s1-u01-lo1"],
                            },
                        },
                    },
                },
                {
                    id: "lesson-2",
                    title: "การเคลื่อนที่แนวตรง",
                    subject: "science_technology",
                    content: {
                        schemaVersion: "lesson_content_v2",
                        outline: { title: "การเคลื่อนที่แนวตรง", topics: [{ id: "topic-2", title: "บทที่ 2", order: 0 }] },
                        topics: [{ id: "topic-2", title: "บทที่ 2", order: 0, contentStatus: "generated", objectives: ["คำนวณ"], sections: [{ id: "section-2", heading: "หัวข้อ", content: "เนื้อหา" }] }],
                        metadata: {
                            curriculum: {
                                subject: "science_technology",
                                curriculumCode: "basic_education_2551_revised_2560",
                                gradeLevel: "ม.4",
                                unitId: "phy-m4-s1-u02",
                                learningOutcomeIds: ["phy-m4-s1-u02-lo1"],
                            },
                        },
                    },
                },
            ],
            students: [
                { completedLessonIds: ["lesson-1", "lesson-2"] },
                { completedLessonIds: ["lesson-1"] },
                { completedLessonIds: [] },
            ],
            assessmentSummary: {
                assessmentCount: 2,
                submittedCount: 3,
                passedCount: 2,
                failedCount: 1,
                notStartedCount: 0,
            },
        })

        expect(analytics.subjectLabel).toBe("วิทยาศาสตร์และเทคโนโลยี")
        expect(analytics.requiredLessonCount).toBe(1)
        expect(analytics.optionalLessonCount).toBe(1)
        expect(analytics.unitCount).toBe(2)
        expect(analytics.assessmentPassRate).toBe(67)
        expect(analytics.lessonCompletion.find((lesson) => lesson.lessonId === "lesson-1")?.completionRate).toBe(67)
    })
})
