import { SubscriptionStatus } from "@business-freelancer/database/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { PAID_STATUSES } from "./getBusinessPlan";
import { getStripe, getTierForPriceId } from "./stripe";

/*
 *   Copies one Stripe subscription into our Subscription table.
 *
 *   Called for every subscription event. Re-reads the subscription from
 *   Stripe instead of trusting the event's copy, because Stripe doesn't
 *   guarantee events arrive in order: an old "updated" event arriving late
 *   could otherwise overwrite newer data.
 **/
export async function syncSubscription(stripeSubscriptionId: string) {
  const stripe = getStripe();
  const subscription =
    await stripe.subscriptions.retrieve(stripeSubscriptionId);

  // Set by our Checkout route. Without them it isn't one of ours.
  const { businessId, payerId } = subscription.metadata;

  if (!businessId || !payerId) return;

  const item = subscription.items.data[0];
  const tier = item ? getTierForPriceId(item.price.id) : null;

  if (!item || !tier) {
    console.warn(
      `Subscription ${subscription.id} has no known price; ignored.`,
    );
    return;
  }

  // Our enum mirrors Stripe's statuses; skip any status Stripe adds later.
  if (
    !Object.values(SubscriptionStatus).includes(
      subscription.status as SubscriptionStatus,
    )
  ) {
    console.warn(
      `Subscription ${subscription.id} has unknown status ${subscription.status}; ignored.`,
    );
    return;
  }

  const fields = {
    stripeSubscriptionId: subscription.id,
    payerId,
    tier,
    status: subscription.status as SubscriptionStatus,
    // The period end lives on the item in current Stripe API versions.
    currentPeriodEnd: new Date(item.current_period_end * 1000),
    // The portal can schedule a cancel either way.
    cancelAtPeriodEnd:
      subscription.cancel_at_period_end || subscription.cancel_at !== null,
  };

  const existing = await prisma.subscription.findUnique({
    where: { businessId },
    select: { stripeSubscriptionId: true },
  });

  // 1. First subscription for this business.
  if (!existing) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });

    // The business was deleted in the meantime; nothing to save.
    if (!business) return;

    await prisma.subscription.create({ data: { businessId, ...fields } });
    return;
  }

  // 2. An update to the business's current subscription
  //    (renewal, tier switch, failed payment, cancel, lapse).
  if (existing.stripeSubscriptionId === subscription.id) {
    await prisma.subscription.update({ where: { businessId }, data: fields });
    return;
  }

  // 3. A different subscription for the same business: a takeover.
  //    Only once it's actually paid. Until then (still paying at Checkout,
  //    or the payment failed), the old payer keeps covering the business.
  //    This also ignores the old subscription's own "canceled" event that
  //    arrives after a takeover.
  if (!PAID_STATUSES.includes(fields.status)) return;

  /*
   * Cancel the old payer's subscription first (no refund or credit), then
   * point the row at the new one. In this order a failure can't leave both
   * subscriptions charging: if the database update fails, Stripe retries the
   * event and the retrieve-check below skips the already-cancelled one.
   */
  const old = await stripe.subscriptions.retrieve(
    existing.stripeSubscriptionId,
  );

  if (old.status !== "canceled") {
    await stripe.subscriptions.cancel(old.id, { prorate: false });
  }

  await prisma.subscription.update({ where: { businessId }, data: fields });
}
