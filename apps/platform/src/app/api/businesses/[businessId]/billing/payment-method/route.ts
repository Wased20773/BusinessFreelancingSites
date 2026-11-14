import { NextResponse } from "next/server";
import { AccessLevel } from "@business-freelancer/database";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { PAID_STATUSES } from "@/lib/billing/getBusinessPlan";
import { requirePayer } from "@/lib/billing/requirePayer";
import { getStripe } from "@/lib/billing/stripe";
import { idOf } from "@/lib/billing/wallet";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

// PATCH /api/businesses/[businessId]/billing/payment-method
// Picks which saved payment method pays this business's plan.
// Nothing is charged; the next renewal uses the new one.
export async function PATCH(
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

    const body = await request.json();

    if (typeof body.paymentMethodId !== "string" || !body.paymentMethodId) {
      return NextResponse.json(
        { error: "Missing payment method" },
        { status: 400 },
      );
    }

    // Only the payer: it's their card.
    const subscription = await requirePayer(businessId, authentication.userId);

    if (subscription instanceof NextResponse) return subscription;

    if (!PAID_STATUSES.includes(subscription.status)) {
      return NextResponse.json(
        { error: "This business's plan has ended" },
        { status: 409 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: authentication.userId },
      select: { stripeCustomerId: true },
    });

    const stripe = getStripe();
    const paymentMethod = await stripe.paymentMethods
      .retrieve(body.paymentMethodId)
      .catch(() => null);

    // The payment method must be one the payer saved.
    if (
      !user?.stripeCustomerId ||
      !paymentMethod ||
      idOf(paymentMethod.customer) !== user.stripeCustomerId
    ) {
      return NextResponse.json(
        { error: "This payment method could not be found" },
        { status: 404 },
      );
    }

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      default_payment_method: paymentMethod.id,
    });

    return NextResponse.json({ paymentMethodId: paymentMethod.id }, { status: 200 });
  } catch (error) {
    console.error("Failed to change the plan's payment method:", error);

    return NextResponse.json(
      { error: "Failed to change the plan's payment method" },
      { status: 500 },
    );
  }
}
