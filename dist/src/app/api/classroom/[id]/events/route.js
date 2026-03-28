"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
exports.DELETE = DELETE;
const server_1 = require("next/server");
// Backward compatibility: redirect to plural endpoint
async function GET(req, { params }) {
    const { id } = await params;
    const url = req.nextUrl.clone();
    url.pathname = `/api/classrooms/${id}/events`;
    return server_1.NextResponse.redirect(url, 308);
}
async function POST(req, { params }) {
    const { id } = await params;
    const url = req.nextUrl.clone();
    url.pathname = `/api/classrooms/${id}/events`;
    return server_1.NextResponse.redirect(url, 308);
}
async function DELETE(req, { params }) {
    const { id } = await params;
    const url = req.nextUrl.clone();
    url.pathname = `/api/classrooms/${id}/events`;
    return server_1.NextResponse.redirect(url, 308);
}
