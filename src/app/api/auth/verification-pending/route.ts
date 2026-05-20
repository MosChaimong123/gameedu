import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isEmailVerificationApiEnabled } from "@/lib/auth/signup-policy";
import {
  EMAIL_VERIFICATION_PURPOSE,
  isEmailVerificationCodeExpired,
  normalizeVerificationEmail,
} from "@/lib/email-verification";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
});

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, max-age=0");
  return NextResponse.json(body, { ...init, headers });
}

export async function GET(req: Request) {
  if (!isEmailVerificationApiEnabled()) {
    return jsonNoStore({ ok: true, pending: false });
  }

  const url = new URL(req.url);
  let email: string;
  try {
    email = querySchema.parse({ email: url.searchParams.get("email") ?? "" }).email;
  } catch {
    return jsonNoStore({ ok: false }, { status: 400 });
  }

  const normalizedEmail = normalizeVerificationEmail(email);
  const user = await db.user.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: "insensitive" },
    },
    select: { id: true, emailVerified: true },
  });

  if (!user || user.emailVerified) {
    return jsonNoStore({ ok: true, pending: false });
  }

  const now = new Date();
  const active = await db.emailVerificationCode.findFirst({
    where: {
      userId: user.id,
      purpose: EMAIL_VERIFICATION_PURPOSE,
      consumedAt: null,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      referenceCode: true,
      codePlain: true,
      expiresAt: true,
    },
  });

  if (!active || isEmailVerificationCodeExpired(active.expiresAt, now)) {
    return jsonNoStore({ ok: true, pending: false });
  }

  return jsonNoStore({
    ok: true,
    pending: true,
    referenceCode: active.referenceCode,
    ...(process.env.NODE_ENV !== "production" && active.codePlain
      ? { devCode: active.codePlain }
      : {}),
    expiresAt: active.expiresAt.toISOString(),
  });
}
