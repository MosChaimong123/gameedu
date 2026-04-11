"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOperationalDb = getOperationalDb;
exports.getRateLimitCollection = getRateLimitCollection;
exports.getAuditLogCollection = getAuditLogCollection;
exports.ensureOperationalIndexes = ensureOperationalIndexes;
exports.pingOperationalDb = pingOperationalDb;
const mongodb_1 = require("mongodb");
const env_1 = require("@/lib/env");
const globalForMongoOps = globalThis;
function inferDbNameFromUrl(url) {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/^\//, "");
    return pathname || "gamedu";
}
async function connectMongo() {
    if (globalForMongoOps.__gameduMongoClient && globalForMongoOps.__gameduMongoDb) {
        return {
            client: globalForMongoOps.__gameduMongoClient,
            db: globalForMongoOps.__gameduMongoDb,
        };
    }
    const env = (0, env_1.getAppEnv)();
    const client = new mongodb_1.MongoClient(env.DATABASE_URL);
    await client.connect();
    const db = client.db(inferDbNameFromUrl(env.DATABASE_URL));
    globalForMongoOps.__gameduMongoClient = client;
    globalForMongoOps.__gameduMongoDb = db;
    return { client, db };
}
async function getOperationalDb() {
    const { db } = await connectMongo();
    return db;
}
async function getRateLimitCollection() {
    const db = await getOperationalDb();
    return db.collection("appRateLimits");
}
async function getAuditLogCollection() {
    const db = await getOperationalDb();
    return db.collection("appAuditLogs");
}
async function ensureOperationalIndexes() {
    if (globalForMongoOps.__gameduMongoIndexesEnsured) {
        return;
    }
    const rateLimits = await getRateLimitCollection();
    await rateLimits.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0, name: "expireAt_ttl" });
    await rateLimits.createIndex({ bucket: 1, key: 1 }, { name: "bucket_key_lookup" });
    const auditLogs = await getAuditLogCollection();
    await auditLogs.createIndex({ timestamp: -1 }, { name: "timestamp_desc" });
    await auditLogs.createIndex({ actorUserId: 1, timestamp: -1 }, { name: "actor_timestamp" });
    await auditLogs.createIndex({ action: 1, timestamp: -1 }, { name: "action_timestamp" });
    await auditLogs.createIndex({ category: 1, timestamp: -1 }, { name: "category_timestamp" });
    globalForMongoOps.__gameduMongoIndexesEnsured = true;
}
async function pingOperationalDb(timeoutMs) {
    const db = await getOperationalDb();
    return Promise.race([
        db.command({ ping: 1 }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Database ping timed out")), timeoutMs)),
    ]);
}
