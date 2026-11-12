import { NextResponse } from "next/server";
import { AccessLevel } from "@business-freelancer/database";
import { PlanTier } from "@business-freelancer/database/generated/prisma/enums";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { PAID_STATUSES } from "@/lib/billing/getBusinessPlan";
import { requirePayer } from "@/lib/billing/requirePayer";
import { getPriceIdForTier, getStripe } from "@/lib/billing/stripe";
import { syncSubscription } from "@/lib/billing/syncSubscription";

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

    /*
     * Swap the price on the existing subscription instead of creating a new
     * one. Stripe prorates: an upgrade adds the difference for the rest of
     * the month to the next invoice; a downgrade credits it.
     */
    await stripe.subscriptions.update(current.id, {
      items: [{ id: current.items.data[0].id, price: getPriceIdForTier(tier) }],
      proration_behavior: "create_prorations",
    });

    // Save the new tier now instead of waiting for the webhook,
    // so the new limits apply on the very next request.
    await syncSubscription(current.id);

    return NextResponse.json({ tier }, { status: 200 });
  } catch (error) {
    console.error("Failed to switch plans:", error);

    return NextResponse.json(
      { error: "Failed to switch plans" },
      { status: 500 },
    );
  }
}
