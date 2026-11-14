import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { auth } from "@/auth";
import { PAID_STATUSES } from "@/lib/billing/getBusinessPlan";
import { getStripe } from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";
import type { AccountPaymentJson } from "@/types/types";

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
        where: { payerId: userId, status: { in: PAID_STATUSES } },
        select: {
          businessId: true,
          tier: true,
          status: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          business: { select: { name: true } },
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

    if (user.stripeCustomerId) {
      const stripe = getStripe();
      const customer = user.stripeCustomerId;

      const [invoices, paymentIntents] = await Promise.all([
        // Subscription payments (new, renewals, plan changes).
        stripe.invoices
          .list({ customer, status: "paid", limit: 100 })
          .autoPagingToArray({ limit: MAX_STRIPE_RECORDS }),
        // One-time location slot payments.
        stripe.paymentIntents
          .list({ customer, limit: 100, expand: ["data.latest_charge"] })
          .autoPagingToArray({ limit: MAX_STRIPE_RECORDS }),
      ]);

      const invoicePayments: AccountPaymentJson[] = invoices.map(
        (invoice) => ({
          id: invoice.id ?? `invoice-${invoice.created}`,
          kind: "subscription",
          businessId:
            invoice.parent?.subscription_details?.metadata?.businessId ?? null,
          businessName: null,
          description: describeInvoice(invoice),
          amount: invoice.amount_paid / 100,
          currency: invoice.currency,
          paidAt: new Date(
            (invoice.status_transitions.paid_at ?? invoice.created) * 1000,
          ).toISOString(),
          receiptUrl: invoice.hosted_invoice_url ?? null,
        }),
      );

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

          return {
            id: paymentIntent.id,
            kind: "location_slot",
            businessId: paymentIntent.metadata.businessId ?? null,
            businessName: null,
            description: "Location slot",
            amount: paymentIntent.amount_received / 100,
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

    // Totals per currency, so different currencies are never added together.
    const totals = new Map<string, number>();

    for (const payment of payments) {
      totals.set(
        payment.currency,
        (totals.get(payment.currency) ?? 0) + payment.amount,
      );
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
        })),
        payments,
        totals: [...totals].map(([currency, amount]) => ({
          currency,
          // Round away float drift from adding dollars.
          amount: Math.round(amount * 100) / 100,
        })),
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
