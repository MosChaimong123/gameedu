import { NextRequest } from "next/server";
import {
  ENDPOINT_NO_LONGER_AVAILABLE_MESSAGE,
  createAppErrorResponse,
} from "@/lib/api-error";

/**
 * Legacy sync endpoint removed. Student portal no longer performs RPG/game-state sync.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  void req;
  void context;

  return createAppErrorResponse(
    "ENDPOINT_NO_LONGER_AVAILABLE",
    ENDPOINT_NO_LONGER_AVAILABLE_MESSAGE,
    410
  );
}
