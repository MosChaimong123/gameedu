import secondaryCoreUnitRowsPayload from "@/lib/curriculum/import/secondary-core-unit-rows.json"
import {
    validateSecondaryCoreUnitRowsPayload,
    type SecondaryCoreUnitRowsPayload,
} from "@/lib/curriculum/import/secondary-core-unit-rows-source"

const validatedPayload = validateSecondaryCoreUnitRowsPayload(secondaryCoreUnitRowsPayload)

if (!validatedPayload.success) {
    throw validatedPayload.error
}

export const SECONDARY_CORE_UNIT_ROWS_PAYLOAD: SecondaryCoreUnitRowsPayload = validatedPayload.data
