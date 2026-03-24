import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { toPrismaJson } from "@/lib/game/game-stats";
import { parseUserSettings } from "@/lib/user-settings";

type SettingsPatchBody = {
  accessibility?: {
    reducedMotion?: boolean;
    reducedSound?: boolean;
  };
};

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as SettingsPatchBody;
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentSettings = parseUserSettings(user.settings);
    const nextSettings = {
      ...currentSettings,
      accessibility: {
        ...currentSettings.accessibility,
        ...(body.accessibility ?? {}),
      },
    };

    const updated = await db.user.update({
      where: { id: session.user.id },
      data: {
        settings: toPrismaJson(nextSettings),
      },
      select: {
        settings: true,
      },
    });

    return NextResponse.json({ settings: updated.settings });
  } catch (error) {
    console.error("[USER_SETTINGS_PATCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
