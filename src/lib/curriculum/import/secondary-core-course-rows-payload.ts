import secondaryCoreCourseRowsPayload from "@/lib/curriculum/import/secondary-core-course-rows.json"
import {
    validateSecondaryCoreCourseSourcePayload,
    type SecondaryCoreCourseSourcePayload,
} from "@/lib/curriculum/import/secondary-core-course-source"

const validatedPayload = validateSecondaryCoreCourseSourcePayload(secondaryCoreCourseRowsPayload)

if (!validatedPayload.success) {
    throw validatedPayload.error
}

export const SECONDARY_CORE_COURSE_SOURCE_PAYLOAD: SecondaryCoreCourseSourcePayload = validatedPayload.data
