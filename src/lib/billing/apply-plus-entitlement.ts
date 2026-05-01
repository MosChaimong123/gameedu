import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/security/audit-log";

export type ApplyPlusPlanParams = {
  userId: string;
  plan: string;
  planStatus: string;
  planExpiry: Date | null;
  /** Sets User.customerId when defined (Stripe Customer id path). Pass undefined to leave unchanged. */
  stripeCustomerId?: string | null;
  billingProvider?: string | null;
  billingExternalCustomerId?: string | null;
  auditAction: string;
  auditMetadata?: Record<string, unknown>;
  /** Override audit action when user row is missing (defaults to billing.plan_entitlement.user_missing). */
  auditActionUserMissing?: string;
  /** Override audit when plan is PRO (defaults to billing.plan_entitlement.skipped_pro_plan). */
  auditActionSkippedPro?: string;
};

/**
 * Central gate for PLUS/FREE entitlement changes from any billing PSP. Preserves PRO (sales-led).
 */
export async function applyPlusPlanEntitlement(params: ApplyPlusPlanParams) {
  const existing = await db.user.findUnique({
    where: { id: params.userId },
    select: { plan: true },
  });

  if (!existing) {
    logAuditEvent({
      action:
        params.auditActionUserMissing ??
        "billing.plan_entitlement.user_missing",
      category: "other",
      status: "rejected",
      targetType: "User",
      targetId: params.userId,
      metadata: params.auditMetadata ?? {},
    });
    return { ok: false as const, reason: "user_not_found" as const };
  }

  if (existing.plan === "PRO") {
    logAuditEvent({
      actorUserId: params.userId,
      action:
        params.auditActionSkippedPro ??
        "billing.plan_entitlement.skipped_pro_plan",
      category: "other",
      status: "success",
      targetType: "User",
      targetId: params.userId,
      metadata: params.auditMetadata ?? {},
    });
    return { ok: true as const, skipped: true as const };
  }

  const data: Prisma.UserUpdateInput = {
    plan: params.plan,
    planStatus: params.planStatus,
    planExpiry: params.planExpiry,
  };

  if (params.stripeCustomerId !== undefined) {
    data.customerId = params.stripeCustomerId;
  }

  if (params.billingProvider !== undefined) {
    data.billingProvider = params.billingProvider;
  }

  if (params.billingExternalCustomerId !== undefined) {
    data.billingExternalCustomerId = params.billingExternalCustomerId;
  }

  await db.user.update({
    where: { id: params.userId },
    data,
  });

  logAuditEvent({
    actorUserId: params.userId,
    action: params.auditAction,
    category: "other",
    status: "success",
    targetType: "User",
    targetId: params.userId,
    metadata: {
      plan: params.plan,
      planStatus: params.planStatus,
      ...(params.auditMetadata ?? {}),
    },
  });

  return { ok: true as const, skipped: false as const };
}
