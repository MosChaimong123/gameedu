import { getLessonPublishReadinessIssues } from "@/lib/lessons/lesson-content"

export function getLessonPublishCommandIssues(content: unknown, confirmPublishReady: unknown) {
    return getLessonPublishReadinessIssues(content, {
        requireTeacherConfirmation: true,
        publishConfirmed: confirmPublishReady === true,
    })
}
