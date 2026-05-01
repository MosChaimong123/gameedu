import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { OMISE_PENDING_CHARGE_COOKIE } from "@/lib/billing/omise-constants";
import { resolveRequestOriginFromUrl } from "@/lib/billing/resolve-public-url";
import { resolveThaiBillingAdapter } from "@/lib/billing/providers/resolve-thai-adapter";

const bodySchema = z.object({
  interval: z.enum(["month", "year"]).default("month"),
});

export async function POST(req: Request) {
  try {
    const adapter = resolveThaiBillingAdapter();
    if (!adapter) {
      return NextResponse.json({ error: "Thai/local billing is not configured" }, { status: 503 });
    }

    const session = await auth();
    const userId = session?.user?.id;
    const role = session?.user?.role;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json ?? {});
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const interval = parsed.data.interval;

    const dbUser = await db.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (dbUser.plan === "PRO") {
      return NextResponse.json(
        { error: "School Pro accounts are managed by your organization." },
        { status: 409 }
      );
    }

    const appOrigin = resolveRequestOriginFromUrl(req.url);
    const result = await adapter.startPlusPurchase({ userId, interval, appOrigin });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    const res = NextResponse.json({ url: result.redirectUrl });
    if (result.pendingChargeId) {
      res.cookies.set(OMISE_PENDING_CHARGE_COOKIE, result.pendingChargeId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 3,
      });
    }
    return res;
  } catch (e) {
    console.error("[billing/thai/start]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
