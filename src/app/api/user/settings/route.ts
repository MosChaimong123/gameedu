import { NextRequest, NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { toPrismaJson } from "@/lib/prisma-json";
import { parseUserSettings } from "@/lib/user-settings";
import { AUTH_REQUIRED_MESSAGE, INTERNAL_ERROR_MESSAGE } from "@/lib/api-error";

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
      return NextResponse.json({ error: AUTH_REQUIRED_MESSAGE }, { status: 401 });
    }

    const body = (await req.json()) as SettingsPatchBody;
    const { accessibility } = body;

    if (accessibility !== undefined) {
      if (
        typeof accessibility !== "object" ||
        accessibility === null ||
        Array.isArray(accessibility)
      ) {
        return NextResponse.json({ error: "Invalid accessibility settings" }, { status: 400 });
      }

      if (
        ("reducedMotion" in accessibility && typeof accessibility.reducedMotion !== "boolean") ||
        ("reducedSound" in accessibility && typeof accessibility.reducedSound !== "boolean")
      ) {
        return NextResponse.json({ error: "Invalid accessibility settings" }, { status: 400 });
      }
    }

    const dbUser = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: { settings: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
    return NextResponse.json({ error: INTERNAL_ERROR_MESSAGE }, { status: 500 });
  }
}
