import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/billing/stripe";

export async function resolveUserIdFromStripeSubscription(sub: Stripe.Subscription): Promise<string | null> {
  const direct = sub.metadata?.userId?.trim();
  if (direct) return direct;

  const customerRef = sub.customer;
  const customerId =
    typeof customerRef === "string" ? customerRef : customerRef && "id" in customerRef ? customerRef.id : null;

  if (customerId) {
    const byCustomer = await db.user.findFirst({
      where: { customerId },
      select: { id: true },
    });
    if (byCustomer) return byCustomer.id;

    const stripe = getStripeClient();
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted && "metadata" in customer) {
      const uid = customer.metadata?.userId?.trim();
      if (uid) return uid;
    }
  }

  return null;
}
