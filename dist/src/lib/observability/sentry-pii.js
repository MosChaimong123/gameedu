"use strict";
/**
 * Shared PII scrubber for Sentry events emitted from any runtime
 * (Next.js Node, Edge, browser, custom server).
 *
 * We never send Sentry the user's session cookie, password, payment
 * card details, OAuth tokens, or full request bodies that could carry
 * those values. Sentry's default `sendDefaultPii: false` already drops
 * cookie + IP, but middleware/route handlers can still attach bodies
 * to events via breadcrumbs and `extra`, so we strip explicitly here.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrubSentryEvent = scrubSentryEvent;
const SECRET_HEADER_NAMES = [
    "cookie",
    "set-cookie",
    "authorization",
    "x-api-key",
    "x-auth-token",
    "x-csrf-token",
    "x-stripe-signature",
    "stripe-signature",
];
const SECRET_FIELD_NAMES = new Set([
    "password",
    "currentpassword",
    "newpassword",
    "confirmpassword",
    "token",
    "accesstoken",
    "refreshtoken",
    "idtoken",
    "secret",
    "authsecret",
    "nextauthsecret",
    "sessiontoken",
    "cardnumber",
    "card_number",
    "cvc",
    "cvv",
    "cvc2",
    "cvv2",
    "expiry",
    "expirymonth",
    "expiryyear",
    "exp_month",
    "exp_year",
    "promptpaynumber",
    "bankaccount",
    "bankaccountnumber",
    "citizenid",
    "national_id",
    "passport",
    "otp",
]);
const REDACTED = "[Filtered]";
function normalizeKey(key) {
    return key.toLowerCase().replace(/[_-]/g, "");
}
function scrubObject(value, depth = 0) {
    if (depth > 6)
        return REDACTED;
    if (value === null || value === undefined)
        return value;
    if (typeof value !== "object")
        return value;
    if (Array.isArray(value)) {
        return value.map((entry) => scrubObject(entry, depth + 1));
    }
    const result = {};
    for (const [k, v] of Object.entries(value)) {
        const norm = normalizeKey(k);
        if (SECRET_FIELD_NAMES.has(norm)) {
            result[k] = REDACTED;
            continue;
        }
        result[k] = scrubObject(v, depth + 1);
    }
    return result;
}
function scrubHeaders(headers) {
    if (!headers)
        return headers;
    const out = {};
    for (const [k, v] of Object.entries(headers)) {
        if (SECRET_HEADER_NAMES.includes(k.toLowerCase())) {
            out[k] = REDACTED;
            continue;
        }
        out[k] = v;
    }
    return out;
}
/**
 * Final filter applied right before Sentry transports an event.
 * Returns `null` to drop the event entirely (we never do this — we
 * just scrub fields and forward).
 */
function scrubSentryEvent(event, _hint) {
    if (event.request) {
        if (event.request.headers) {
            event.request.headers = scrubHeaders(event.request.headers);
        }
        if (event.request.cookies) {
            event.request.cookies = REDACTED;
        }
        if (event.request.data) {
            event.request.data = scrubObject(event.request.data);
        }
    }
    if (event.extra) {
        event.extra = scrubObject(event.extra);
    }
    if (event.contexts) {
        event.contexts = scrubObject(event.contexts);
    }
    if (event.user) {
        if ("ip_address" in event.user && event.user.ip_address !== "{{auto}}") {
            event.user.ip_address = REDACTED;
        }
    }
    return event;
}
