"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuditEvent = logAuditEvent;
exports.listRecentAuditEvents = listRecentAuditEvents;
exports.buildAuditLogQuery = buildAuditLogQuery;
const env_1 = require("@/lib/env");
const mongo_admin_1 = require("@/lib/ops/mongo-admin");
function inferAuditCategory(action) {
    if (action.startsWith("admin."))
        return "admin";
    if (action.startsWith("classroom."))
        return "classroom";
    if (action.startsWith("socket."))
        return "socket";
    if (action.startsWith("upload."))
        return "upload";
    if (action.startsWith("auth."))
        return "auth";
    return "other";
}
function inferAuditReason(event) {
    var _a, _b;
    if (typeof event.reason === "string" && event.reason.trim()) {
        return event.reason.trim();
    }
    const metadataReason = (_a = event.metadata) === null || _a === void 0 ? void 0 : _a.reason;
    if (typeof metadataReason === "string" && metadataReason.trim()) {
        return metadataReason.trim();
    }
    const metadataCode = (_b = event.metadata) === null || _b === void 0 ? void 0 : _b.code;
    if (typeof metadataCode === "string" && metadataCode.trim()) {
        return metadataCode.trim();
    }
    return null;
}
function logAuditEvent(event) {
    var _a, _b;
    const payload = {
        timestamp: new Date(),
        category: (_a = event.category) !== null && _a !== void 0 ? _a : inferAuditCategory(event.action),
        reason: inferAuditReason(event),
        status: (_b = event.status) !== null && _b !== void 0 ? _b : "success",
        ...event,
    };
    const sink = (0, env_1.resolveAuditLogSink)();
    if (sink === "console" || sink === "both") {
        console.info("[AUDIT]", JSON.stringify(payload));
    }
    if (sink === "mongo" || sink === "both") {
        void (0, mongo_admin_1.getAuditLogCollection)()
            .then((collection) => collection.insertOne(payload))
            .catch((error) => {
            console.error("[AUDIT_LOG_WRITE_FAILED]", error);
        });
    }
}
function escapeRegex(input) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
async function listRecentAuditEvents(limit = 50, filters = {}) {
    const collection = await (0, mongo_admin_1.getAuditLogCollection)();
    const normalizedLimit = Math.max(1, Math.min(limit, 200));
    const query = buildAuditLogQuery(filters);
    const events = await collection
        .find(query, {
        projection: {
            _id: 0,
            actorUserId: 1,
            action: 1,
            category: 1,
            reason: 1,
            status: 1,
            targetType: 1,
            targetId: 1,
            metadata: 1,
            timestamp: 1,
        },
    })
        .sort({ timestamp: -1 })
        .limit(normalizedLimit)
        .toArray();
    return events.map((event) => {
        var _a, _b, _c;
        return ({
            actorUserId: (_a = event.actorUserId) !== null && _a !== void 0 ? _a : null,
            action: event.action,
            category: (_b = event.category) !== null && _b !== void 0 ? _b : inferAuditCategory(event.action),
            reason: typeof event.reason === "string" ? event.reason : null,
            status: event.status === "rejected" || event.status === "error" ? event.status : "success",
            targetType: event.targetType,
            targetId: (_c = event.targetId) !== null && _c !== void 0 ? _c : null,
            metadata: event.metadata,
            timestamp: new Date(event.timestamp),
        });
    });
}
function buildAuditLogQuery(filters) {
    var _a, _b, _c, _d, _e;
    const clauses = [];
    if ((_a = filters.action) === null || _a === void 0 ? void 0 : _a.trim()) {
        clauses.push({
            action: { $regex: escapeRegex(filters.action.trim()), $options: "i" },
        });
    }
    if ((_b = filters.actionPrefix) === null || _b === void 0 ? void 0 : _b.trim()) {
        clauses.push({
            action: { $regex: `^${escapeRegex(filters.actionPrefix.trim())}`, $options: "i" },
        });
    }
    if ((_c = filters.actorUserId) === null || _c === void 0 ? void 0 : _c.trim()) {
        clauses.push({
            actorUserId: { $regex: escapeRegex(filters.actorUserId.trim()), $options: "i" },
        });
    }
    if ((_d = filters.targetId) === null || _d === void 0 ? void 0 : _d.trim()) {
        clauses.push({
            targetId: { $regex: escapeRegex(filters.targetId.trim()), $options: "i" },
        });
    }
    if (filters.status) {
        clauses.push({ status: filters.status });
    }
    if ((_e = filters.reason) === null || _e === void 0 ? void 0 : _e.trim()) {
        clauses.push({
            reason: { $regex: escapeRegex(filters.reason.trim()), $options: "i" },
        });
    }
    if (filters.category) {
        if (filters.category === "other") {
            clauses.push({
                action: {
                    $not: /^(admin|classroom|socket|upload|auth)\./i,
                },
            });
        }
        else {
            clauses.push({
                action: { $regex: `^${escapeRegex(filters.category)}\\.`, $options: "i" },
            });
        }
    }
    if (filters.since) {
        clauses.push({ timestamp: { $gte: filters.since } });
    }
    if (clauses.length === 0) {
        return {};
    }
    if (clauses.length === 1) {
        return clauses[0];
    }
    return { $and: clauses };
}
