import secondaryCoreCourseDescriptionsPayload from "@/lib/curriculum/import/secondary-core-course-descriptions.json"
import {
    validateSecondaryCoreCourseDescriptionsPayload,
    type SecondaryCoreCourseDescriptionsPayload,
} from "@/lib/curriculum/import/secondary-core-course-descriptions-source"

const validatedPayload = validateSecondaryCoreCourseDescriptionsPayload(secondaryCoreCourseDescriptionsPayload)

if (!validatedPayload.success) {
    throw validatedPayload.error
}

export const SECONDARY_CORE_COURSE_DESCRIPTIONS_PAYLOAD: SecondaryCoreCourseDescriptionsPayload =
    validatedPayload.data
