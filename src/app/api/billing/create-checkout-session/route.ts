import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getStripeCheckoutConfigured, getStripeClient, resolvePlusStripePriceId } from "@/lib/billing/stripe";
import { resolvePublicAppOrigin } from "@/lib/billing/resolve-public-url";

const bodySchema = z.object({
  interval: z.enum(["month", "year"]).default("month"),
});

export async function POST(req: Request) {
  try {
    if (!getStripeCheckoutConfigured()) {
      return NextResponse.json({ error: "Billing is not configured" }, { status: 503 });
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
    const priceId = resolvePlusStripePriceId(interval);
    if (!priceId) {
      return NextResponse.json({ error: "Price not configured for interval" }, { status: 503 });
    }

    const dbUser = await db.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        customerId: true,
        plan: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (dbUser.plan === "PRO") {
      return NextResponse.json(
        { error: "School Pro accounts are managed by your organization. Contact us to change billing." },
        { status: 409 }
      );
    }

    const stripe = getStripeClient();
    let customerId = dbUser.customerId?.trim() ?? null;

    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch {
        customerId = null;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: dbUser.email ?? undefined,
        metadata: { userId },
      });
      customerId = customer.id;
      await db.user.update({
        where: { id: userId },
        data: { customerId },
      });
    } else {
      await stripe.customers.update(customerId, {
        metadata: { userId },
      });
    }

    const origin = resolvePublicAppOrigin();

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/upgrade?checkout=success`,
      cancel_url: `${origin}/dashboard/upgrade?checkout=cancelled`,
      metadata: { userId },
      subscription_data: {
        metadata: { userId },
      },
    });

    if (!checkoutSession.url) {
      return NextResponse.json({ error: "Could not create checkout session" }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (e) {
    console.error("[billing/create-checkout-session]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
