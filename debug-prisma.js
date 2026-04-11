import { db } from "./src/lib/db.js"

console.log("ALL_KEYS:", Object.keys(db))
console.log("OMR_KEYS:", Object.keys(db).filter(k => k.toLowerCase().includes("omr")))
process.exit(0)
