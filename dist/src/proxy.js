"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.proxy = void 0;
var auth_1 = require("./auth");
Object.defineProperty(exports, "proxy", { enumerable: true, get: function () { return auth_1.auth; } });
exports.config = {
    // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
    matcher: ['/((?!api|_next/static|_next/image|socket.io|favicon.ico|.*\\.png$).*)'],
};
