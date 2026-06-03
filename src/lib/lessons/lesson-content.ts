export type LessonContentPayload = {
    objectives: string[]
    sections: Array<{
        id: string
        heading: string
        content: string
        examples: Array<{ title: string; body: string }>
    }>
    keyTerms: Array<{ term: string; definition: string }>
    summary: string
    estimatedMinutes: number
}

function isNonEmptyText(value: unknown) {
    return typeof value === "string" && value.trim().length > 0
}

function isTextArray(value: unknown) {
    return Array.isArray(value) && value.every(isNonEmptyText)
}

export function isLessonContentPayload(value: unknown): value is LessonContentPayload {
    if (!value || typeof value !== "object") return false

    const content = value as Record<string, unknown>
    if (!isTextArray(content.objectives)) return false
    if (!Array.isArray(content.sections) || content.sections.length === 0) return false
    if (!isNonEmptyText(content.summary)) return false
    if (typeof content.estimatedMinutes !== "number" || !Number.isFinite(content.estimatedMinutes)) return false

    return content.sections.every((section) => {
        if (!section || typeof section !== "object") return false
        const item = section as Record<string, unknown>
        const examples = item.examples
        return (
            isNonEmptyText(item.id) &&
            isNonEmptyText(item.heading) &&
            isNonEmptyText(item.content) &&
            Array.isArray(examples) &&
            examples.every((example) => {
                if (!example || typeof example !== "object") return false
                const entry = example as Record<string, unknown>
                return isNonEmptyText(entry.title) && isNonEmptyText(entry.body)
            })
        )
    })
}
