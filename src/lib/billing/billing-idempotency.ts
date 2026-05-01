import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * Reserves an external billing event before handling (Stripe evt_..., Omise charge id, ...).
 * Returns false if already processed.
 */
export async function claimBillingProviderEvent(
  provider: string,
  externalEventId: string
): Promise<boolean> {
  try {
    await db.billingProviderEvent.create({
      data: { provider, externalEventId },
    });
    return true;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return false;
    }
    throw e;
  }
}

export async function releaseBillingProviderEvent(
  provider: string,
  externalEventId: string
): Promise<void> {
  await db.billingProviderEvent.deleteMany({
    where: { provider, externalEventId },
  });
}
