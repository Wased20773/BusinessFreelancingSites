import { NextResponse } from "next/server";
import { AccessLevel } from "@business-freelancer/database";
import { PlanTier } from "@business-freelancer/database/generated/prisma/enums";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { PAID_STATUSES } from "@/lib/billing/getBusinessPlan";
import { requirePayer } from "@/lib/billing/requirePayer";
import { getAppUrl, getPriceIdForTier, getStripe } from "@/lib/billing/stripe";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

// POST /api/businesses/[businessId]/billing/switch
export async function POST(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    const { businessId } = await params;

    if (!businessId) {
      return NextResponse.json(
        { error: "Missing businessId" },
        { status: 400 },
      );
    }

    const authentication = await authenticateBusinessAccess(
      request,
      businessId,
      [
        AccessLevel.developer,
        AccessLevel.owner,
        AccessLevel.admin,
        AccessLevel.staff,
      ],
    );

    if (authentication instanceof NextResponse) return authentication;

    const body = await request.json().catch(() => ({}));

    if (!Object.values(PlanTier).includes(body.tier)) {
      return NextResponse.json(
        { error: "Select a valid plan" },
        { status: 400 },
      );
    }

    const tier = body.tier as PlanTier;

    const subscription = await requirePayer(businessId, authentication.userId);

    if (subscription instanceof NextResponse) return subscription;

    if (!PAID_STATUSES.includes(subscription.status)) {
      return NextResponse.json(
        {
          error:
            "This subscription has ended. Subscribe again from the Billing page.",
        },
        { status: 409 },
      );
    }

    if (subscription.tier === tier) {
      return NextResponse.json(
        { error: "This business is already on that plan" },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    const current = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId,
    );

    const customerId =
      typeof current.customer === "string"
        ? current.customer
        : current.customer.id;
    const billingUrl = `${getAppUrl()}/businesses/${businessId}/billing`;

    /*
     * Nothing changes here. The payer is sent to Stripe's confirmation page,
     * which shows the new price and the prorated charge or credit. The
     * subscription only changes once they confirm there, and the
     * customer.subscription.updated webhook saves the new tier.
     */
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: billingUrl,
      flow_data: {
        type: "subscription_update_confirm",
        subscription_update_confirm: {
          subscription: current.id,
          items: [
            {
              id: current.items.data[0].id,
              price: getPriceIdForTier(tier),
              quantity: 1,
            },
          ],
        },
        after_completion: {
          type: "redirect",
          redirect: { return_url: `${billingUrl}?switch=success` },
        },
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error("Failed to switch plans:", error);

    return NextResponse.json(
      { error: "Failed to switch plans" },
      { status: 500 },
    );
  }
}
