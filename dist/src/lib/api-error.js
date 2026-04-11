"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INTERNAL_ERROR_MESSAGE = exports.FORBIDDEN_MESSAGE = exports.AUTH_REQUIRED_MESSAGE = void 0;
exports.createAppError = createAppError;
exports.createAppErrorResponse = createAppErrorResponse;
const server_1 = require("next/server");
exports.AUTH_REQUIRED_MESSAGE = "Unauthorized";
exports.FORBIDDEN_MESSAGE = "Forbidden";
exports.INTERNAL_ERROR_MESSAGE = "Internal Server Error";
function createAppError(code, message) {
    return {
        error: {
            code,
            message,
        },
    };
}
function createAppErrorResponse(code, message, status, init) {
    var _a;
    return server_1.NextResponse.json(createAppError(code, message), {
        ...init,
        status,
        headers: {
            ...((_a = init === null || init === void 0 ? void 0 : init.headers) !== null && _a !== void 0 ? _a : {}),
        },
    });
}
