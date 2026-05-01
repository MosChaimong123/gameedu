import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient, getStripeSecretKey, getStripeWebhookSecret } from "@/lib/billing/stripe";
import { claimStripeWebhookEvent, releaseStripeWebhookClaim } from "@/lib/billing/stripe-idempotency";
import {
  handleStripeCheckoutSessionCompleted,
  handleStripeSubscriptionDeleted,
  handleStripeSubscriptionUpdated,
} from "@/lib/billing/stripe-webhook-handlers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const webhookSecret = getStripeWebhookSecret();
  const apiSecret = getStripeSecretKey();

  if (!webhookSecret || !apiSecret) {
    console.error("[webhooks/stripe] Missing STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[webhooks/stripe] Signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const claimed = await claimStripeWebhookEvent(event.id);
  if (!claimed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleStripeCheckoutSessionCompleted(session);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await handleStripeSubscriptionUpdated(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleStripeSubscriptionDeleted(sub);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[webhooks/stripe] Handler error", event.type, e);
    await releaseStripeWebhookClaim(event.id);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
