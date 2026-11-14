import { prisma } from "@/lib/prisma";
import { PAID_STATUSES } from "./getBusinessPlan";
import { getStripe } from "./stripe";
import { syncSubscription } from "./syncSubscription";

/*
 *   Deleting a business: cancel its subscription right away, so a deleted
 *   business can never keep being charged. No refund, like any cancellation.
 *
 *   Throws if Stripe fails, so the caller stops before deleting anything.
 **/
export async function cancelSubscriptionForDeletedBusiness(businessId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { businessId },
    select: { stripeSubscriptionId: true },
  });

  if (!subscription) return;

  const stripe = getStripe();

  // Our row can lag behind Stripe; cancelling twice is an error in Stripe.
  const current = await stripe.subscriptions.retrieve(
    subscription.stripeSubscriptionId,
  );

  if (current.status === "canceled") return;

  await stripe.subscriptions.cancel(current.id);
}

/*
 *   The payer left or was removed: stop their subscription at the end of the
 *   month they already paid for, so they are never charged again. The
 *   business keeps the plan until then, and anyone can take over meanwhile.
 *
 *   Does nothing if the user isn't this business's payer.
 *   Throws if Stripe fails, so the caller doesn't remove them while still billed.
 **/
export async function cancelSubscriptionForDepartingPayer(
  businessId: string,
  userId: string,
) {
  const subscription = await prisma.subscription.findUnique({
    where: { businessId },
    select: {
      payerId: true,
      stripeSubscriptionId: true,
      status: true,
      cancelAtPeriodEnd: true,
    },
  });

  if (
    !subscription ||
    subscription.payerId !== userId ||
    !PAID_STATUSES.includes(subscription.status) ||
    subscription.cancelAtPeriodEnd
  ) {
    return;
  }

  await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  // Save it now instead of waiting for the webhook.
  await syncSubscription(subscription.stripeSubscriptionId);
}
