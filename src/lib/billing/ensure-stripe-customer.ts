import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/billing/stripe";

/** Resolve or create a Stripe Customer for checkout (card subscription or PromptPay pass). */
export async function ensureStripeCustomerForUser(params: {
  userId: string;
  email: string | null;
  existingCustomerId: string | null;
}): Promise<string> {
  const stripe = getStripeClient();
  let customerId = params.existingCustomerId?.trim() ?? null;

  if (customerId) {
    try {
      await stripe.customers.retrieve(customerId);
    } catch {
      customerId = null;
    }
  }

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: params.email ?? undefined,
      metadata: { userId: params.userId },
    });
    customerId = customer.id;
    await db.user.update({
      where: { id: params.userId },
      data: { customerId },
    });
  } else {
    await stripe.customers.update(customerId, {
      metadata: { userId: params.userId },
    });
  }

  return customerId;
}
