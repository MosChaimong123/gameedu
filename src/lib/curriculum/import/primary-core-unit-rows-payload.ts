import primaryCoreUnitRowsPayload from "@/lib/curriculum/import/primary-core-unit-rows.json"
import {
    validatePrimaryCoreUnitRowsPayload,
    type PrimaryCoreUnitRowsPayload,
} from "@/lib/curriculum/import/primary-core-unit-rows-source"

const validatedPayload = validatePrimaryCoreUnitRowsPayload(primaryCoreUnitRowsPayload)

if (!validatedPayload.success) {
    throw validatedPayload.error
}

export const PRIMARY_CORE_UNIT_ROWS_PAYLOAD: PrimaryCoreUnitRowsPayload = validatedPayload.data
