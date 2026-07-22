import type { WebhookEventPayload } from "resend";
import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/security/audit-log";

const PASSWORD_RESET_PURPOSE = "PASSWORD_RESET";
const FAILURE_STATUSES = ["BOUNCED", "COMPLAINED", "SUPPRESSED", "FAILED"] as const;
export const EMAIL_DELIVERY_EVENT_RETENTION_DAYS = 90;

type PasswordResetDeliveryStatus =
  | "ACCEPTED"
  | "DELIVERED"
  | "BOUNCED"
  | "COMPLAINED"
  | "SUPPRESSED"
  | "FAILED"
  | "DELAYED";

type EmailWebhookEvent = Extract<WebhookEventPayload, { type: `email.${string}` }>;

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function parseBoundedNumber(raw: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function resolvePasswordResetDeliveryAlertSettings(env: NodeJS.ProcessEnv = process.env) {
  return {
    windowMinutes: parseBoundedNumber(env.PASSWORD_RESET_DELIVERY_ALERT_WINDOW_MINUTES, 60, 5, 1440),
    minSample: Math.round(parseBoundedNumber(env.PASSWORD_RESET_DELIVERY_ALERT_MIN_SAMPLE, 10, 1, 10000)),
    failureRatePercent: parseBoundedNumber(
      env.PASSWORD_RESET_DELIVERY_ALERT_FAILURE_PERCENT,
      20,
      1,
      100
    ),
  };
}

export function mapResendEventToDeliveryStatus(type: EmailWebhookEvent["type"]): PasswordResetDeliveryStatus | null {
  switch (type) {
    case "email.sent":
      return "ACCEPTED";
    case "email.delivered":
      return "DELIVERED";
    case "email.bounced":
      return "BOUNCED";
    case "email.complained":
      return "COMPLAINED";
    case "email.suppressed":
      return "SUPPRESSED";
    case "email.failed":
      return "FAILED";
    case "email.delivery_delayed":
      return "DELAYED";
    default:
      return null;
  }
}

export function shouldApplyDeliveryTransition(current: string | null | undefined, next: PasswordResetDeliveryStatus) {
  if (!current || current === "PENDING" || current === "SCHEDULED") return true;
  if (FAILURE_STATUSES.includes(next as (typeof FAILURE_STATUSES)[number])) return true;
  if (current === "ACCEPTED") return next !== "ACCEPTED";
  if (current === "DELAYED") return next !== "ACCEPTED";
  return false;
}

function isEmailWebhookEvent(event: WebhookEventPayload): event is EmailWebhookEvent {
  return event.type.startsWith("email.") && "email_id" in event.data;
}

async function emitFailureRateAlertIfNeeded() {
  const settings = resolvePasswordResetDeliveryAlertSettings();
  const since = new Date(Date.now() - settings.windowMinutes * 60_000);
  const [acceptedCount, failureCount] = await Promise.all([
    db.emailVerificationCode.count({
      where: { purpose: PASSWORD_RESET_PURPOSE, providerAcceptedAt: { gte: since } },
    }),
    db.emailVerificationCode.count({
      where: {
        purpose: PASSWORD_RESET_PURPOSE,
        providerAcceptedAt: { gte: since },
        deliveryStatus: { in: [...FAILURE_STATUSES] },
      },
    }),
  ]);
  const failureRatePercent = acceptedCount > 0 ? (failureCount / acceptedCount) * 100 : 0;
  if (acceptedCount < settings.minSample || failureRatePercent < settings.failureRatePercent) return;

  const metadata = {
    acceptedCount,
    failureCount,
    failureRatePercent: Math.round(failureRatePercent * 100) / 100,
    windowMinutes: settings.windowMinutes,
  };
  console.error("[password-reset-delivery-alert]", JSON.stringify(metadata));
  logAuditEvent({
    action: "auth.password_reset.delivery_alert",
    category: "auth",
    status: "error",
    targetType: "password_reset_delivery",
    metadata,
  });
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureMessage("Password reset email delivery failure rate exceeded", {
      level: "error",
      tags: { domain: "auth", signal: "password_reset_delivery" },
      extra: metadata,
    });
  } catch {
    // Audit and stderr remain the fallback alert channels when Sentry is unavailable.
  }
}

export async function processResendPasswordResetEvent(
  event: WebhookEventPayload,
  providerEventId: string
): Promise<{ ignored?: boolean; duplicate?: boolean; matched?: boolean; status?: string | null }> {
  if (!isEmailWebhookEvent(event)) return { ignored: true };

  const deliveryStatus = mapResendEventToDeliveryStatus(event.type);
  const occurredAtValue = new Date(event.created_at);
  const occurredAt = Number.isNaN(occurredAtValue.getTime()) ? new Date() : occurredAtValue;
  const expiresAt = new Date(occurredAt.getTime() + EMAIL_DELIVERY_EVENT_RETENTION_DAYS * 86_400_000);

  try {
    await db.emailDeliveryWebhookEvent.create({
      data: {
        provider: "resend",
        providerEventId,
        providerMessageId: event.data.email_id,
        eventType: event.type,
        deliveryStatus,
        occurredAt,
        expiresAt,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) return { duplicate: true };
    throw error;
  }

  try {
    const code = await db.emailVerificationCode.findFirst({
      where: {
        purpose: PASSWORD_RESET_PURPOSE,
        providerMessageId: event.data.email_id,
      },
      select: { id: true, userId: true, referenceCode: true, deliveryStatus: true },
    });
    const shouldUpdate = Boolean(
      code && deliveryStatus && shouldApplyDeliveryTransition(code.deliveryStatus, deliveryStatus)
    );
    if (code && deliveryStatus && shouldUpdate) {
      await db.emailVerificationCode.update({
        where: { id: code.id },
        data: { deliveryStatus, deliveryUpdatedAt: occurredAt },
      });
    }
    await db.emailDeliveryWebhookEvent.update({
      where: { providerEventId },
      data: { matched: Boolean(code), processedAt: new Date() },
    });

    if (code && deliveryStatus === "DELIVERED") {
      logAuditEvent({
        actorUserId: code.userId,
        action: "auth.password_reset.delivered",
        category: "auth",
        status: "success",
        targetType: "user",
        targetId: code.userId,
        metadata: { provider: "resend", referenceCode: code.referenceCode },
      });
    } else if (code && FAILURE_STATUSES.includes(deliveryStatus as (typeof FAILURE_STATUSES)[number])) {
      logAuditEvent({
        actorUserId: code.userId,
        action: "auth.password_reset.delivery_failed",
        category: "auth",
        status: "error",
        targetType: "user",
        targetId: code.userId,
        metadata: { provider: "resend", referenceCode: code.referenceCode, deliveryStatus },
      });
      await emitFailureRateAlertIfNeeded();
    }

    return { matched: Boolean(code), status: deliveryStatus };
  } catch (error) {
    await db.emailDeliveryWebhookEvent.deleteMany({ where: { providerEventId } }).catch(() => undefined);
    throw error;
  }
}
