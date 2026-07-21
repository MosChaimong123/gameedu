import { describe, expect, it } from "vitest"

import type { LessonContentV2 } from "@/lib/lessons/lesson-content"

import { extractCurriculumLessons, normalizeLessonContentForRender } from "../student-lesson-player-model"
import type { AssignedLesson } from "../student-lesson-player.types"

const content: LessonContentV2 = {
    schemaVersion: "lesson_content_v2",
    outline: {
        title: "Forces",
        topics: [
            { id: "topic-visible", title: "Visible", order: 0 },
            { id: "topic-empty", title: "Empty", order: 1 },
        ],
    },
    topics: [
        {
            id: "topic-visible",
            title: "Visible",
            order: 0,
            contentStatus: "empty",
            objectives: ["Explain force"],
            sections: [{ id: "section-1", heading: "Force", content: "A push or pull." }],
        },
        {
            id: "topic-empty",
            title: "Empty",
            order: 1,
            contentStatus: "generated",
            objectives: [],
            sections: [],
        },
    ],
}

describe("student lesson player model", () => {
    it("normalizes rendering through the canonical active-topic policy", () => {
        const rendered = normalizeLessonContentForRender(content)

        expect(rendered.topics.map((topic) => topic.id)).toEqual(["topic-visible"])
        expect(rendered.sections).toHaveLength(1)
    })

    it("builds navigation lessons from the same canonical topic set", () => {
        const assignment = {
            id: "assignment-1",
            lesson: {
                id: "lesson-1",
                title: "Forces",
                subject: "science",
                gradeLevel: "m4",
                content,
            },
            completions: [],
        } satisfies AssignedLesson

        expect(extractCurriculumLessons([assignment])).toEqual([
            expect.objectContaining({
                lessonId: "lesson-1",
                topics: [expect.objectContaining({ id: "topic-visible" })],
            }),
        ])
    })
})
