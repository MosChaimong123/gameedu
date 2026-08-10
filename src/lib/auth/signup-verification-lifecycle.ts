import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { EMAIL_VERIFICATION_PURPOSE } from "@/lib/email-verification";

export const SIGNUP_VERIFICATION_STATUS = {
  pending: "PENDING",
  active: "ACTIVE",
  consumed: "CONSUMED",
  failed: "FAILED",
  expired: "EXPIRED",
} as const;

export function activeSignupVerificationWhere(
  userId?: string
): Prisma.EmailVerificationCodeWhereInput {
  return {
    ...(userId ? { userId } : {}),
    purpose: EMAIL_VERIFICATION_PURPOSE,
    AND: [
      { OR: [{ consumedAt: null }, { consumedAt: { isSet: false } }] },
      {
        OR: [
          { status: SIGNUP_VERIFICATION_STATUS.active },
          { status: { isSet: false } },
        ],
      },
    ],
  };
}

export async function failPendingSignupVerification(codeId: string, failedAt = new Date()) {
  await db.emailVerificationCode.updateMany({
    where: {
      id: codeId,
      status: SIGNUP_VERIFICATION_STATUS.pending,
      OR: [{ consumedAt: null }, { consumedAt: { isSet: false } }],
    },
    data: {
      status: SIGNUP_VERIFICATION_STATUS.failed,
      consumedAt: failedAt,
      codePlain: null,
      deliveryStatus: "FAILED",
      deliveryUpdatedAt: failedAt,
    },
  });
}

export async function activatePendingSignupVerification(params: {
  codeId: string;
  userId: string;
  provider: "resend" | "console";
  providerMessageId?: string;
  acceptedAt?: Date;
}) {
  const acceptedAt = params.acceptedAt ?? new Date();
  await db.$transaction(async (tx) => {
    const activated = await tx.emailVerificationCode.updateMany({
      where: {
        id: params.codeId,
        userId: params.userId,
        purpose: EMAIL_VERIFICATION_PURPOSE,
        status: SIGNUP_VERIFICATION_STATUS.pending,
        OR: [{ consumedAt: null }, { consumedAt: { isSet: false } }],
      },
      data: {
        status: SIGNUP_VERIFICATION_STATUS.active,
        emailProvider: params.provider,
        providerMessageId: params.providerMessageId,
        deliveryStatus: "ACCEPTED",
        providerAcceptedAt: acceptedAt,
        deliveryUpdatedAt: acceptedAt,
        lastSentAt: acceptedAt,
      },
    });
    if (activated.count !== 1) {
      throw new Error("SIGNUP_VERIFICATION_STATE_CHANGED");
    }
    await tx.emailVerificationCode.updateMany({
      where: {
        ...activeSignupVerificationWhere(params.userId),
        id: { not: params.codeId },
      },
      data: {
        status: SIGNUP_VERIFICATION_STATUS.consumed,
        consumedAt: acceptedAt,
        codePlain: null,
      },
    });
  });
}
