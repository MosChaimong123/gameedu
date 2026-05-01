import { NextResponse } from "next/server";
import { addMonths, addYears } from "date-fns";
import { z } from "zod";
import { getAppEnv } from "@/lib/env";
import { applyPlusPlanEntitlement } from "@/lib/billing/apply-plus-entitlement";
import { BILLING_PROVIDER_THAI_MOCK } from "@/lib/billing/billing-providers";
import { omiseRetrieveCharge } from "@/lib/billing/omise-api";
import {
  applyPlusFromPaidOmiseCharge,
  extractOmiseEventChargeId,
} from "@/lib/billing/omise-entitlement";
import {
  claimBillingProviderEvent,
  releaseBillingProviderEvent,
} from "@/lib/billing/billing-idempotency";
import { getThaiBillingProviderId } from "@/lib/billing/thai-billing-env";

export const runtime = "nodejs";

const mockBodySchema = z.object({
  userId: z.string().min(1),
  interval: z.enum(["month", "year"]),
  /** Idempotency id (e.g. random uuid per test run) */
  externalEventId: z.string().min(1),
});

export async function POST(
  req: Request,
  props: { params: Promise<{ provider: string }> }
) {
  const { provider } = await props.params;
  const rawBody = await req.text();

  if (provider === "mock") {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    const expected = getAppEnv().BILLING_THAI_WEBHOOK_SECRET;
    if (!expected || token !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (getThaiBillingProviderId() !== "mock") {
      return NextResponse.json({ error: "Mock provider is not active" }, { status: 503 });
    }

    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = mockBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { userId, interval, externalEventId } = parsed.data;

    const claimed = await claimBillingProviderEvent(BILLING_PROVIDER_THAI_MOCK, externalEventId);
    if (!claimed) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    try {
      const now = new Date();
      const planExpiry = interval === "month" ? addMonths(now, 1) : addYears(now, 1);

      const result = await applyPlusPlanEntitlement({
        userId,
        plan: "PLUS",
        planStatus: "ACTIVE",
        planExpiry,
        billingProvider: BILLING_PROVIDER_THAI_MOCK,
        billingExternalCustomerId: externalEventId,
        auditAction: "billing.thai_mock.webhook",
        auditMetadata: { interval, externalEventId },
      });

      if (result.ok === false) {
        await releaseBillingProviderEvent(BILLING_PROVIDER_THAI_MOCK, externalEventId);
        return NextResponse.json({ error: "User not found" }, { status: 400 });
      }
    } catch (e) {
      console.error("[webhooks/billing/mock]", e);
      await releaseBillingProviderEvent(BILLING_PROVIDER_THAI_MOCK, externalEventId);
      return NextResponse.json({ error: "Handler failed" }, { status: 500 });
    }

    return NextResponse.json({ received: true });
  }

  if (provider === "omise") {
    if (getThaiBillingProviderId() !== "omise") {
      return NextResponse.json({ error: "Omise provider is not active" }, { status: 503 });
    }

    const secret = getAppEnv().OMISE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: "Omise is not configured" }, { status: 500 });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const evt = body as {
      object?: string;
      key?: string;
      id?: string;
      data?: unknown;
    };

    if (evt.object !== "event") {
      return NextResponse.json({ error: "Not an Omise event" }, { status: 400 });
    }

    if (evt.key !== "charge.complete") {
      return NextResponse.json({ received: true, ignored: true });
    }

    const chargeId = extractOmiseEventChargeId(evt.data);
    if (!chargeId) {
      return NextResponse.json({ error: "Missing charge id" }, { status: 400 });
    }

    const retrieved = await omiseRetrieveCharge(secret, chargeId);
    if (!retrieved.ok) {
      console.error("[webhooks/billing/omise] retrieve failed:", retrieved.message);
      return NextResponse.json({ error: "Could not verify charge" }, { status: 502 });
    }

    try {
      const outcome = await applyPlusFromPaidOmiseCharge(retrieved.charge, {
        source: "webhook",
        omiseEventId: typeof evt.id === "string" ? evt.id : undefined,
      });

      if (outcome === "skipped_not_paid") {
        return NextResponse.json({
          received: true,
          skipped: true,
          status: retrieved.charge.status ?? "unknown",
        });
      }
      if (outcome === "duplicate") {
        return NextResponse.json({ received: true, duplicate: true });
      }
      if (outcome === "missing_charge_id") {
        return NextResponse.json({ error: "Invalid charge payload" }, { status: 400 });
      }
      if (outcome === "missing_user_metadata") {
        return NextResponse.json({ error: "Missing user metadata on charge" }, { status: 400 });
      }
      if (outcome === "user_not_found") {
        return NextResponse.json({ error: "User not found" }, { status: 400 });
      }

      return NextResponse.json({ received: true });
    } catch (e) {
      console.error("[webhooks/billing/omise]", e);
      return NextResponse.json({ error: "Handler failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Provider not implemented" }, { status: 501 });
}
