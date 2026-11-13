import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";

/*
 *   A slot purchase finished paying: record the slot.
 *   Keyed on the Checkout session ID, so Stripe sending the same event
 *   twice still records one slot.
 **/
export async function recordSlotPurchase(session: Stripe.Checkout.Session) {
  const { kind, businessId, buyerId } = session.metadata ?? {};

  // Subscription Checkouts also send this event; only slots are handled here.
  if (
    kind !== "location_slot" ||
    !businessId ||
    session.payment_status !== "paid"
  ) {
    return;
  }

  await prisma.locationSlotPurchase
    .upsert({
      where: { stripeCheckoutSessionId: session.id },
      create: {
        businessId,
        buyerId: buyerId ?? null,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
      },
      update: {},
    })
    .catch((error) => {
      // The business was deleted after Checkout started; nothing to save.
      if (error?.code === "P2003") return;
      throw error;
    });
}

/*
 *   A chargeback: the bank took the money back, so the slot is revoked.
 *   Existing locations are never touched; the business just can't add
 *   new ones while it's over its slot count.
 **/
export async function revokeSlotPurchase(dispute: Stripe.Dispute) {
  const paymentIntentId =
    typeof dispute.payment_intent === "string" ? dispute.payment_intent : null;

  if (!paymentIntentId) return;

  /*
   * At most one row can match (stripePaymentIntentId is unique).
   * updateMany is used because it does nothing when no row matches,
   * which is normal (a dispute on a subscription payment has no slot,
   * or the slot was already revoked), while update would throw.
   */
  await prisma.locationSlotPurchase.updateMany({
    where: { stripePaymentIntentId: paymentIntentId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
