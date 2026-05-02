import { NextRequest, NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { toPrismaJson } from "@/lib/prisma-json";
import { parseUserSettings } from "@/lib/user-settings";
import {
  AUTH_REQUIRED_MESSAGE,
  INTERNAL_ERROR_MESSAGE,
  createAppErrorResponse,
} from "@/lib/api-error";

type SettingsPatchBody = {
  accessibility?: {
    reducedMotion?: boolean;
    reducedSound?: boolean;
  };
};

export async function PATCH(req: NextRequest) {
  try {
    const sessionUser = await requireSessionUser();
    if (!sessionUser?.id) {
      return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    const body = (await req.json()) as SettingsPatchBody;
    const { accessibility } = body;

    if (accessibility !== undefined) {
      if (
        typeof accessibility !== "object" ||
        accessibility === null ||
        Array.isArray(accessibility)
      ) {
        return createAppErrorResponse(
          "INVALID_ACCESSIBILITY_SETTINGS",
          "Invalid accessibility settings",
          400
        );
      }

      if (
        ("reducedMotion" in accessibility && typeof accessibility.reducedMotion !== "boolean") ||
        ("reducedSound" in accessibility && typeof accessibility.reducedSound !== "boolean")
      ) {
        return createAppErrorResponse(
          "INVALID_ACCESSIBILITY_SETTINGS",
          "Invalid accessibility settings",
          400
        );
      }
    }

    const dbUser = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: { settings: true },
    });

    if (!dbUser) {
      return createAppErrorResponse("NOT_FOUND", "User not found", 404);
    }

    const currentSettings = parseUserSettings(dbUser.settings);
    const nextSettings = {
      ...currentSettings,
      accessibility: {
        ...currentSettings.accessibility,
        ...(body.accessibility ?? {}),
      },
    };

    const updated = await db.user.update({
      where: { id: sessionUser.id },
      data: {
        settings: toPrismaJson(nextSettings),
      },
      select: {
        settings: true,
      },
    });

    return NextResponse.json({ settings: parseUserSettings(updated.settings) });
  } catch (error) {
    console.error("[USER_SETTINGS_PATCH]", error);
    return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
  }
}
