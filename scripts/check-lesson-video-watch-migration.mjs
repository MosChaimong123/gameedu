import "./load-env-for-cli.mjs"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    const watches = await prisma.topicVideoWatch.findMany({
        select: {
            id: true,
            studentId: true,
            lessonId: true,
            topicId: true,
            mediaId: true,
        },
    })

    const invalidMediaIds = watches.filter(
        (watch) => typeof watch.mediaId !== "string" || watch.mediaId.trim().length === 0
    )
    const rowsByCompositeKey = new Map()

    for (const watch of watches) {
        const normalizedMediaId = typeof watch.mediaId === "string" ? watch.mediaId.trim() : ""
        const key = [watch.studentId, watch.lessonId, watch.topicId, normalizedMediaId].join(":")
        const rows = rowsByCompositeKey.get(key) ?? []
        rows.push(watch.id)
        rowsByCompositeKey.set(key, rows)
    }

    const duplicates = [...rowsByCompositeKey.entries()].filter(([, ids]) => ids.length > 1)

    console.log(`TopicVideoWatch rows: ${watches.length}`)
    console.log(`Rows with empty mediaId: ${invalidMediaIds.length}`)
    console.log(`Duplicate media-level composite keys: ${duplicates.length}`)

    if (invalidMediaIds.length > 0) {
        console.error("Rows requiring manual mediaId repair:", invalidMediaIds.map((watch) => watch.id).join(", "))
    }
    if (duplicates.length > 0) {
        for (const [key, ids] of duplicates) {
            console.error(`Duplicate ${key}: ${ids.join(", ")}`)
        }
    }
    if (invalidMediaIds.length > 0 || duplicates.length > 0) {
        console.error("Migration preflight failed. Repair the reported rows before running prisma db push.")
        process.exitCode = 1
        return
    }

    console.log("Migration preflight passed. Existing rows already contain mediaId; no data backfill is required.")
}

main()
    .catch((error) => {
        console.error(error)
        process.exitCode = 1
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
