import { describe, expect, it } from "vitest"
import {
    CANONICAL_SUBJECT_CATALOG,
    findCanonicalSubjectByLabel,
    getCanonicalChildSubjects,
    getCanonicalSubjectById,
    getCanonicalSubjectDisplayName,
    getCanonicalSubjectSourceEntries,
    isCanonicalSubjectCatalog,
    isCanonicalSubjectId,
    validateCanonicalSubjectCatalog,
} from "../subject-catalog"

describe("canonical subject catalog", () => {
    it("accepts the canonical subject catalog", () => {
        expect(isCanonicalSubjectCatalog(CANONICAL_SUBJECT_CATALOG)).toBe(true)
        expect(validateCanonicalSubjectCatalog(CANONICAL_SUBJECT_CATALOG).success).toBe(true)
    })

    it("keeps physics as an additional subject under science and technology", () => {
        const physics = getCanonicalSubjectById("physics")

        expect(physics).not.toBeNull()
        expect(physics?.groupType).toBe("additional_subject")
        expect(physics?.parentSubjectId).toBe("science_technology")
        expect(physics?.gradeLevels).toEqual(["m4", "m5", "m6"])
        expect(physics?.semesterMode).toBe("required")
    })

    it("resolves core subject display names in Thai and English", () => {
        expect(getCanonicalSubjectDisplayName("thai")).toBe("ภาษาไทย")
        expect(getCanonicalSubjectDisplayName("mathematics", "en")).toBe("Mathematics")
    })

    it("finds subject ids from Thai and English labels", () => {
        expect(findCanonicalSubjectByLabel("ฟิสิกส์")?.id).toBe("physics")
        expect(findCanonicalSubjectByLabel("science & technology")?.id).toBe("science_technology")
        expect(findCanonicalSubjectByLabel("ภาษาไทย")?.id).toBe("thai")
    })

    it("returns science child subjects from the shared parent id", () => {
        const children = getCanonicalChildSubjects("science_technology")

        expect(children.map((entry) => entry.id)).toEqual(
            expect.arrayContaining(["physics", "chemistry", "biology", "earth_space_science"])
        )
    })

    it("maps source registry entries back to a subject", () => {
        const entries = getCanonicalSubjectSourceEntries("physics")

        expect(entries.length).toBeGreaterThan(0)
        expect(entries[0]?.provider).toBe("ipst")
    })

    it("lets core subjects keep flexible semester handling", () => {
        expect(getCanonicalSubjectById("thai")?.semesterMode).toBe("optional")
    })

    it("accepts only canonical subject ids", () => {
        expect(isCanonicalSubjectId("physics")).toBe(true)
        expect(isCanonicalSubjectId("history")).toBe(false)
    })
})
