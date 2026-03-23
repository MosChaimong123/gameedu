import { NextRequest, NextResponse } from "next/server";

// Backward compatibility: redirect to plural endpoint
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = req.nextUrl.clone();
  url.pathname = `/api/classrooms/${id}/custom-achievements/award`;
  return NextResponse.redirect(url, 308);
}
