import type Stripe from "stripe";
import { PAID_STATUSES } from "@/lib/billing/getBusinessPlan";
import type { SubscriptionStatus } from "@business-freelancer/database/generated/prisma/enums";

// Far more than one person has at this scale; keeps a request bounded.
const MAX_STRIPE_RECORDS = 1000;

export type Wallet = {
  customer: Stripe.Customer | Stripe.DeletedCustomer;
  paymentMethods: Stripe.PaymentMethod[];
  // The user's subscriptions that are still paid.
  paidSubscriptions: Stripe.Subscription[];
  customerDefault: string | null;
};

// Stripe fields can be an id or the expanded object.
export function idOf(value: string | { id: string } | null | undefined) {
  if (!value) return null;

  return typeof value === "string" ? value : value.id;
}

/*
 *   The user's saved payment methods and paid subscriptions, from Stripe.
 **/
export async function loadWallet(
  stripe: Stripe,
  customerId: string,
): Promise<Wallet> {
  const [paymentMethods, subscriptions, customer] = await Promise.all([
    // Every type: cards, Link, and anything else.
    stripe.customers
      .listPaymentMethods(customerId, { limit: 100 })
      .autoPagingToArray({ limit: MAX_STRIPE_RECORDS }),
    stripe.subscriptions
      .list({ customer: customerId, status: "all", limit: 100 })
      .autoPagingToArray({ limit: MAX_STRIPE_RECORDS }),
    stripe.customers.retrieve(customerId),
  ]);

  return {
    customer,
    paymentMethods,
    paidSubscriptions: subscriptions.filter((subscription) =>
      PAID_STATUSES.includes(subscription.status as SubscriptionStatus),
    ),
    customerDefault: customer.deleted
      ? null
      : idOf(customer.invoice_settings.default_payment_method),
  };
}

/*
 *   A paid plan that will charge again. A plan set to end (the payer
 *   cancelled, or left the business) stays "active" until its period
 *   ends, but never renews, so its card is free to remove.
 **/
export function willRenew(subscription: Stripe.Subscription): boolean {
  return !subscription.cancel_at_period_end && !subscription.cancel_at;
}

/*
 *   Stripe saves the same card again each time it's entered. Its fingerprint
 *   is the same for the same card, so copies share one key. Other types
 *   (like Link) have no fingerprint and are their own key.
 **/
export function sameCardKey(paymentMethod: Stripe.PaymentMethod): string {
  return paymentMethod.card?.fingerprint
    ? `card:${paymentMethod.card.fingerprint}`
    : paymentMethod.id;
}

/*
 *   The payment method a subscription bills. Checkout saves the card on the
 *   subscription itself; the customer's default is only the fallback.
 **/
export function billedPaymentMethod(
  subscription: Stripe.Subscription,
  wallet: Wallet,
): string | null {
  return idOf(subscription.default_payment_method) ?? wallet.customerDefault;
}

/*
 *   One entry per real card: copies of the same card are grouped, keeping
 *   the copy a subscription bills (so that one is what the UI selects).
 **/
export function groupPaymentMethods(wallet: Wallet) {
  const billedIds = new Set(
    wallet.paidSubscriptions.map((subscription) =>
      billedPaymentMethod(subscription, wallet),
    ),
  );

  const groups = new Map<
    string,
    { shown: Stripe.PaymentMethod; copies: Stripe.PaymentMethod[] }
  >();

  for (const paymentMethod of wallet.paymentMethods) {
    const key = sameCardKey(paymentMethod);
    const group = groups.get(key);

    if (!group) {
      groups.set(key, { shown: paymentMethod, copies: [paymentMethod] });
      continue;
    }

    group.copies.push(paymentMethod);

    if (!billedIds.has(group.shown.id) && billedIds.has(paymentMethod.id)) {
      group.shown = paymentMethod;
    }
  }

  return [...groups.values()];
}
