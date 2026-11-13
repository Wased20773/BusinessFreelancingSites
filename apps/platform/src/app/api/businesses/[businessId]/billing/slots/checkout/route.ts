import { NextResponse } from "next/server";
import { AccessLevel } from "@business-freelancer/database";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { getBusinessPlan } from "@/lib/billing/getBusinessPlan";
import { LOCATION_SLOTS } from "@/lib/billing/plans";
import {
  getAppUrl,
  getLocationSlotPriceId,
  getOrCreateStripeCustomer,
  getStripe,
} from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

// POST /api/businesses/[businessId]/billing/slots/checkout
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
     * Anyone in the business can buy a slot, regardless of role.
     * The slot belongs to the business, not the buyer.
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

    /*
     * Authentication already proved the business exists; this query is for
     * its name, which labels the payment in Stripe.
     */
    const [business, plan] = await Promise.all([
      prisma.business.findUnique({
        where: { id: businessId },
        select: { name: true },
      }),
      getBusinessPlan(businessId),
    ]);

    if (!business) {
      return NextResponse.json(
        { error: "This business does not exist in our records" },
        { status: 404 },
      );
    }

    // Past the self-serve cap, the business contacts us instead.
    if (plan.locationSlots >= LOCATION_SLOTS.selfServeCap) {
      return NextResponse.json(
        {
          error: `This business has reached ${LOCATION_SLOTS.selfServeCap} location slots. Contact us to add more.`,
        },
        { status: 409 },
      );
    }

    const customerId = await getOrCreateStripeCustomer(authentication.userId);
    const appUrl = getAppUrl();

    const metadata = {
      kind: "location_slot",
      businessId,
      buyerId: authentication.userId,
    };

    /*
     * A one-time payment (mode "payment"), not a subscription.
     * The metadata tells the webhook what was bought and for which business.
     */
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: getLocationSlotPriceId(), quantity: 1 }],
      metadata,
      payment_intent_data: {
        description: `Location slot for ${business.name}`,
        metadata,
      },
      success_url: `${appUrl}/businesses/${businessId}/billing?slot=success`,
      cancel_url: `${appUrl}/businesses/${businessId}/billing?slot=cancelled`,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error("Failed to start slot checkout:", error);

    return NextResponse.json(
      { error: "Failed to start slot checkout" },
      { status: 500 },
    );
  }
}
