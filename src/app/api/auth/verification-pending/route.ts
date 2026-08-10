import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { resolveAuthSecret } from "@/lib/env";
import { isEmailVerificationApiEnabled } from "@/lib/auth/signup-policy";
import {
  decodeVerificationFlowHandle,
  VERIFICATION_FLOW_COOKIE,
} from "@/lib/auth/verification-flow-handle";
import { activeSignupVerificationWhere } from "@/lib/auth/signup-verification-lifecycle";
import { isEmailVerificationCodeExpired } from "@/lib/email-verification";

export const dynamic = "force-dynamic";

function jsonNoStore(body: unknown) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function GET(req: Request) {
  void req;
  if (!isEmailVerificationApiEnabled()) {
    return jsonNoStore({ ok: true, pending: false });
  }

  const secret = resolveAuthSecret();
  const jar = await cookies();
  const rawHandle = jar.get(VERIFICATION_FLOW_COOKIE)?.value;
  const flow = rawHandle && secret
    ? decodeVerificationFlowHandle(rawHandle, secret)
    : null;

  if (!flow) {
    return jsonNoStore({ ok: true, pending: false });
  }

  const active = await db.emailVerificationCode.findFirst({
    where: {
      ...activeSignupVerificationWhere(flow.userId),
      email: flow.email,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      userId: true,
      referenceCode: true,
      expiresAt: true,
    },
  });

  if (!active || isEmailVerificationCodeExpired(active.expiresAt, new Date())) {
    return jsonNoStore({ ok: true, pending: false });
  }

  const user = await db.user.findUnique({
    where: { id: flow.userId },
    select: { emailVerified: true },
  });

  if (!user || user.emailVerified) {
    return jsonNoStore({ ok: true, pending: false });
  }

  return jsonNoStore({
    ok: true,
    pending: true,
    email: flow.email,
    referenceCode: active.referenceCode,
    expiresAt: active.expiresAt.toISOString(),
    ...(process.env.NODE_ENV !== "production" && flow.devCode
      ? { devCode: flow.devCode }
      : {}),
  });
}
