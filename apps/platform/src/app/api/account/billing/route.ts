import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { auth } from "@/auth";
import { PAID_STATUSES } from "@/lib/billing/getBusinessPlan";
import { getStripe } from "@/lib/billing/stripe";
import {
  billedPaymentMethod,
  groupPaymentMethods,
  loadWallet,
  willRenew,
} from "@/lib/billing/wallet";
import { prisma } from "@/lib/prisma";
import type {
  AccountPaymentJson,
  AccountPaymentMethodJson,
  PriceJson,
} from "@/types/types";

// Far more than one person pays for at this scale; keeps a request bounded.
const MAX_STRIPE_RECORDS = 1000;

// Why the invoice was created, in words.
function describeInvoice(invoice: Stripe.Invoice): string {
  switch (invoice.billing_reason) {
    case "subscription_create":
      return "New subscription";
    case "subscription_cycle":
      return "Monthly renewal";
    case "subscription_update":
      return "Plan change";
    default:
      return "Subscription payment";
  }
}

// Adds cents to a currency's total, so currencies are never mixed.
function addToTotal(
  totals: Map<string, number>,
  currency: string,
  cents: number,
) {
  if (cents <= 0) return;

  totals.set(currency, (totals.get(currency) ?? 0) + cents);
}

// "visa" → "Visa", "amex" → "American Express"
const CARD_BRANDS: Record<string, string> = {
  amex: "American Express",
  diners: "Diners Club",
  discover: "Discover",
  jcb: "JCB",
  mastercard: "Mastercard",
  unionpay: "UnionPay",
  visa: "Visa",
};

// A payment method in words, e.g. "Visa •••• 4242" or "Link (you@example.com)".
function describePaymentMethod(paymentMethod: Stripe.PaymentMethod): {
  label: string;
  expires: string | null;
} {
  const { card, link } = paymentMethod;

  if (card) {
    return {
      label: `${CARD_BRANDS[card.brand] ?? card.brand} •••• ${card.last4}`,
      expires: `${String(card.exp_month).padStart(2, "0")}/${String(card.exp_year).slice(-2)}`,
    };
  }

  if (link) {
    return {
      label: link.email ? `Link (${link.email})` : "Link",
      expires: null,
    };
  }

  // Any other type, e.g. "us_bank_account" → "Us bank account".
  const words = paymentMethod.type.replaceAll("_", " ");

  return {
    label: words.charAt(0).toUpperCase() + words.slice(1),
    expires: null,
  };
}

// GET /api/account/billing
// Everything the signed-in user pays for, across all their businesses.
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 },
      );
    }

    const userId = session.user.id;

    const [user, subscriptions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
      }),
      prisma.subscription.findMany({
        where: {
          payerId: userId,
          status: { in: PAID_STATUSES },
          // Hidden only counts while they're out of the business; if they
          // were added back, the plan shows again so they can manage it.
          OR: [
            { hiddenByPayer: false },
            { business: { users: { some: { userId } } } },
          ],
        },
        select: {
          businessId: true,
          tier: true,
          status: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          business: {
            select: {
              name: true,
              // Still a member? A removed payer keeps paying until the
              // plan ends but can't open the business anymore.
              users: { where: { userId }, select: { id: true } },
            },
          },
        },
        orderBy: { currentPeriodEnd: "asc" },
      }),
    ]);

    if (!user) {
      return NextResponse.json(
        { error: "User account could not be found" },
        { status: 404 },
      );
    }

    /*
     * Payments come from Stripe, the record of what was actually charged.
     * Someone who never paid has no Stripe customer, so no payments.
     */
    let payments: AccountPaymentJson[] = [];
    let paymentMethods: AccountPaymentMethodJson[] = [];
    let paymentMethodIdByBusiness = new Map<string, string>();
    // Unused account credit (a Stripe customer balance below zero).
    let credit: PriceJson | null = null;
    // What the card was actually charged, per currency.
    const totals = new Map<string, number>();

    if (user.stripeCustomerId) {
      const stripe = getStripe();
      const customer = user.stripeCustomerId;

      const [invoices, paymentIntents, wallet] = await Promise.all([
        // Subscription payments (new, renewals, plan changes).
        stripe.invoices
          .list({ customer, status: "paid", limit: 100 })
          .autoPagingToArray({ limit: MAX_STRIPE_RECORDS }),
        // One-time location slot payments.
        stripe.paymentIntents
          .list({ customer, limit: 100, expand: ["data.latest_charge"] })
          .autoPagingToArray({ limit: MAX_STRIPE_RECORDS }),
        // Saved payment methods and which one each subscription bills.
        loadWallet(stripe, customer),
      ]);

      const stripeCustomer = wallet.customer;
      const groups = groupPaymentMethods(wallet);

      // Copies of the same card point at the one entry that is shown.
      const shownIdByCopy = new Map(
        groups.flatMap((group) =>
          group.copies.map((copy) => [copy.id, group.shown.id] as const),
        ),
      );

      // Which payment method each paid business is billed to.
      const shownIdByBusiness = new Map<string, string>();
      // Businesses whose plan will charge again (not set to end).
      const renewingBusinessIds = new Set<string>();

      for (const stripeSubscription of wallet.paidSubscriptions) {
        const businessId = stripeSubscription.metadata.businessId;
        const billedId = billedPaymentMethod(stripeSubscription, wallet);
        const shownId = billedId ? shownIdByCopy.get(billedId) : undefined;

        if (!businessId) continue;
        if (shownId) shownIdByBusiness.set(businessId, shownId);
        if (willRenew(stripeSubscription)) renewingBusinessIds.add(businessId);
      }

      paymentMethodIdByBusiness = shownIdByBusiness;

      // "Pays for" counts only plans that renew; an ending plan never
      // charges again, so it doesn't stop the card from being removed.
      paymentMethods = groups.map(({ shown }) => ({
        id: shown.id,
        type: shown.type,
        ...describePaymentMethod(shown),
        usedBy: subscriptions
          .filter(
            (subscription) =>
              renewingBusinessIds.has(subscription.businessId) &&
              shownIdByBusiness.get(subscription.businessId) === shown.id,
          )
          .map((subscription) => subscription.business.name),
      }));

      if (
        !stripeCustomer.deleted &&
        stripeCustomer.balance < 0 &&
        stripeCustomer.currency
      ) {
        credit = {
          amount: -stripeCustomer.balance / 100,
          currency: stripeCustomer.currency,
        };
      }

      /*
       * total is what the invoice cost; amount_paid is only the card part.
       * Account credit covers the rest. A negative total is a downgrade
       * that left credit behind.
       */
      const invoicePayments: AccountPaymentJson[] = invoices.map((invoice) => {
        const isCredit = invoice.total < 0;

        addToTotal(totals, invoice.currency, invoice.amount_paid);

        return {
          id: invoice.id ?? `invoice-${invoice.created}`,
          kind: isCredit ? "credit" : "subscription",
          businessId:
            invoice.parent?.subscription_details?.metadata?.businessId ?? null,
          businessName: null,
          description: isCredit ? "Credit added" : describeInvoice(invoice),
          amount: invoice.total / 100,
          paidFromCredit: isCredit
            ? 0
            : Math.max(0, invoice.total - invoice.amount_paid) / 100,
          currency: invoice.currency,
          paidAt: new Date(
            (invoice.status_transitions.paid_at ?? invoice.created) * 1000,
          ).toISOString(),
          receiptUrl: invoice.hosted_invoice_url ?? null,
        };
      });

      const slotPayments: AccountPaymentJson[] = paymentIntents
        .filter(
          (paymentIntent) =>
            paymentIntent.status === "succeeded" &&
            paymentIntent.metadata.kind === "location_slot",
        )
        .map((paymentIntent) => {
          const charge =
            typeof paymentIntent.latest_charge === "object"
              ? paymentIntent.latest_charge
              : null;

          // Slots are paid by card in Checkout; credit never applies.
          addToTotal(
            totals,
            paymentIntent.currency,
            paymentIntent.amount_received,
          );

          return {
            id: paymentIntent.id,
            kind: "location_slot",
            businessId: paymentIntent.metadata.businessId ?? null,
            businessName: null,
            description: "Location slot",
            amount: paymentIntent.amount_received / 100,
            paidFromCredit: 0,
            currency: paymentIntent.currency,
            paidAt: new Date(paymentIntent.created * 1000).toISOString(),
            receiptUrl: charge?.receipt_url ?? null,
          };
        });

      payments = [...invoicePayments, ...slotPayments];

      // Name each payment's business; a deleted business keeps a null name.
      const businessIds = [
        ...new Set(
          payments
            .map((payment) => payment.businessId)
            .filter((id): id is string => id !== null),
        ),
      ];

      const businesses =
        businessIds.length > 0
          ? await prisma.business.findMany({
              where: { id: { in: businessIds } },
              select: { id: true, name: true },
            })
          : [];

      const namesById = new Map(
        businesses.map((business) => [business.id, business.name]),
      );

      payments = payments
        .map((payment) => ({
          ...payment,
          businessName: payment.businessId
            ? (namesById.get(payment.businessId) ?? null)
            : null,
        }))
        .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
    }

    return NextResponse.json(
      {
        subscriptions: subscriptions.map((subscription) => ({
          businessId: subscription.businessId,
          businessName: subscription.business.name,
          tier: subscription.tier,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          paymentMethodId:
            paymentMethodIdByBusiness.get(subscription.businessId) ?? null,
          isMember: subscription.business.users.length > 0,
        })),
        payments,
        // Summed in cents, so there's no float drift.
        totals: [...totals].map(([currency, cents]) => ({
          currency,
          amount: cents / 100,
        })),
        credit,
        paymentMethods,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to load account billing:", error);

    return NextResponse.json(
      { error: "Failed to load your billing history" },
      { status: 500 },
    );
  }
}
