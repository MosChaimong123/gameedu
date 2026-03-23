import { NextRequest, NextResponse } from "next/server";

// Backward compatibility: redirect to plural endpoint
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = req.nextUrl.clone();
  url.pathname = `/api/classrooms/${id}/custom-achievements`;
  return NextResponse.redirect(url, 308);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = req.nextUrl.clone();
  url.pathname = `/api/classrooms/${id}/custom-achievements`;
  return NextResponse.redirect(url, 308);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = req.nextUrl.clone();
  url.pathname = `/api/classrooms/${id}/custom-achievements`;
  return NextResponse.redirect(url, 308);
}
