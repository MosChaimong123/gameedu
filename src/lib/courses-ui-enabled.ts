/**
 * Course LMS surfaces (teacher course builder, classroom course tab, student course player).
 * Hidden by default: courses only wrap published Lesson V2 records, and the duplicate
 * assessment/certificate/progress stack confuses both teachers and students. API routes and
 * data stay intact — flip this on to bring the UI back.
 *
 * Set `NEXT_PUBLIC_COURSES_UI_ENABLED=true` to re-enable.
 */
export function isCoursesUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_COURSES_UI_ENABLED === "true";
}
