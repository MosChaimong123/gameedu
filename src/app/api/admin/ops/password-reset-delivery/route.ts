import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE, createAppErrorResponse } from "@/lib/api-error";
import { db } from "@/lib/db";
import { resolvePasswordResetDeliveryAlertSettings } from "@/lib/email/password-reset-delivery";
import { normalizeVerificationReferenceCode } from "@/lib/email-verification";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const querySchema = z.object({
  referenceCode: z
    .string()
    .transform((value) => normalizeVerificationReferenceCode(value))
    .refine((value) => /^TP-[A-Z0-9]{4}$/.test(value)),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
  }
  if (session.user.role !== "ADMIN") {
    return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
  }

  const parsed = querySchema.safeParse({
    referenceCode: new URL(req.url).searchParams.get("referenceCode") ?? "",
  });
  if (!parsed.success) {
    return createAppErrorResponse("INVALID_PAYLOAD", "Invalid reference code", 400);
  }

  const alertSettings = resolvePasswordResetDeliveryAlertSettings();
  const since = new Date(Date.now() - alertSettings.windowMinutes * 60_000);
  const [record, acceptedCount, failureCount] = await Promise.all([
    db.emailVerificationCode.findFirst({
      where: { purpose: "PASSWORD_RESET", referenceCode: parsed.data.referenceCode },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        referenceCode: true,
        emailProvider: true,
        providerMessageId: true,
        deliveryStatus: true,
        providerAcceptedAt: true,
        deliveryUpdatedAt: true,
        expiresAt: true,
      },
    }),
    db.emailVerificationCode.count({
      where: { purpose: "PASSWORD_RESET", providerAcceptedAt: { gte: since } },
    }),
    db.emailVerificationCode.count({
      where: {
        purpose: "PASSWORD_RESET",
        providerAcceptedAt: { gte: since },
        deliveryStatus: { in: ["BOUNCED", "COMPLAINED", "SUPPRESSED", "FAILED"] },
      },
    }),
  ]);
  const failureRatePercent = acceptedCount > 0
    ? Math.round((failureCount / acceptedCount) * 10_000) / 100
    : 0;

  return NextResponse.json({
    found: Boolean(record),
    delivery: record
      ? {
          referenceCode: record.referenceCode,
          provider: record.emailProvider,
          providerMessageId: record.providerMessageId,
          status: record.deliveryStatus,
          providerAcceptedAt: record.providerAcceptedAt?.toISOString() ?? null,
          deliveryUpdatedAt: record.deliveryUpdatedAt?.toISOString() ?? null,
          challengeExpiresAt: record.expiresAt.toISOString(),
        }
      : null,
    health: {
      windowMinutes: alertSettings.windowMinutes,
      acceptedCount,
      failureCount,
      failureRatePercent,
      alertThresholdPercent: alertSettings.failureRatePercent,
      alertMinSample: alertSettings.minSample,
      alerting:
        acceptedCount >= alertSettings.minSample &&
        failureRatePercent >= alertSettings.failureRatePercent,
    },
  });
}
