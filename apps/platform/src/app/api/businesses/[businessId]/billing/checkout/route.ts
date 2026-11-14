import { NextResponse } from "next/server";
import { AccessLevel } from "@business-freelancer/database";
import { PlanTier } from "@business-freelancer/database/generated/prisma/enums";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { getBusinessPlan } from "@/lib/billing/getBusinessPlan";
import { isHigherPlan } from "@/lib/billing/plans";
import {
  getAppUrl,
  getOrCreateStripeCustomer,
  getPriceIdForTier,
  getStripe,
} from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

// POST /api/businesses/[businessId]/billing/checkout
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

    /*
     * Anyone in the business can pay, regardless of role.
     * Paying grants no permissions.
     */
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

    const body = await request.json();

    if (!Object.values(PlanTier).includes(body.tier)) {
      return NextResponse.json(
        { error: "Select a valid plan" },
        { status: 400 },
      );
    }

    const tier = body.tier as PlanTier;

    const [business, plan] = await Promise.all([
      prisma.business.findUnique({
        where: { id: businessId },
        select: {
          name: true,
          subscription: { select: { payerId: true } },
        },
      }),
      getBusinessPlan(businessId),
    ]);

    if (!business) {
      return NextResponse.json(
        { error: "This business does not exist in our records" },
        { status: 404 },
      );
    }

    /*
     * The current payer changes tiers from the Billing page instead;
     * Checkout always creates a new subscription.
     *
     * Anyone else subscribing is a takeover: once this new subscription is
     * paid, the webhook cancels the old payer's subscription (no refund).
     */
    if (
      plan.planKey !== "free" &&
      business.subscription?.payerId === authentication.userId
    ) {
      return NextResponse.json(
        {
          error:
            "You already pay for this business. Switch plans from the Billing page instead.",
        },
        { status: 409 },
      );
    }

    /*
     * A takeover must be to a higher plan. Only the payer can move the
     * business to the same or a lower plan, so nobody can cancel the
     * payer's subscription to downgrade the whole business.
     */
    if (plan.planKey !== "free" && !isHigherPlan(tier, plan.planKey)) {
      return NextResponse.json(
        {
          error:
            "Only the current payer can keep or lower this plan. To take over, pick a higher plan.",
        },
        { status: 409 },
      );
    }

    const customerId = await getOrCreateStripeCustomer(authentication.userId);
    const appUrl = getAppUrl();

    /*
     * businessId and payerId ride along on the subscription itself, so
     * every later webhook for it knows which business and payer it's for.
     * The business name labels it in the payer's portal and invoices.
     */
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: getPriceIdForTier(tier), quantity: 1 }],
      client_reference_id: businessId,
      subscription_data: {
        description: business.name,
        metadata: { businessId, payerId: authentication.userId },
      },
      success_url: `${appUrl}/businesses/${businessId}/billing?checkout=success`,
      cancel_url: `${appUrl}/businesses/${businessId}/billing?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error("Failed to start checkout:", error);

    return NextResponse.json(
      { error: "Failed to start checkout" },
      { status: 500 },
    );
  }
}
