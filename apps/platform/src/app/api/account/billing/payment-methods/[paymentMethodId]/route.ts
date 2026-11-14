import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStripe } from "@/lib/billing/stripe";
import {
  billedPaymentMethod,
  loadWallet,
  sameCardKey,
  willRenew,
} from "@/lib/billing/wallet";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ paymentMethodId: string }>;
};

// DELETE /api/account/billing/payment-methods/[paymentMethodId]
// Removes a saved payment method, and every saved copy of the same card.
export async function DELETE(
  _request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 },
      );
    }

    const { paymentMethodId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: "You don't have any saved payment methods" },
        { status: 404 },
      );
    }

    const stripe = getStripe();
    const wallet = await loadWallet(stripe, user.stripeCustomerId);

    // Only the user's own payment methods can be removed.
    const target = wallet.paymentMethods.find(
      (paymentMethod) => paymentMethod.id === paymentMethodId,
    );

    if (!target) {
      return NextResponse.json(
        { error: "This payment method could not be found" },
        { status: 404 },
      );
    }

    const key = sameCardKey(target);
    const copies = wallet.paymentMethods.filter(
      (paymentMethod) => sameCardKey(paymentMethod) === key,
    );
    const copyIds = new Set(copies.map((copy) => copy.id));

    /*
     * A plan that renews on this card would fail without it, so the plan
     * has to switch to another card first. Plans that are ending don't count.
     */
    const isPayingForPlan = wallet.paidSubscriptions.some((subscription) => {
      if (!willRenew(subscription)) return false;

      const billedId = billedPaymentMethod(subscription, wallet);

      return billedId !== null && copyIds.has(billedId);
    });

    if (isPayingForPlan) {
      return NextResponse.json(
        {
          error:
            "This payment method pays for a plan. Switch that plan to another card first.",
        },
        { status: 409 },
      );
    }

    for (const copy of copies) {
      await stripe.paymentMethods.detach(copy.id);
    }

    return NextResponse.json({ removed: copies.length }, { status: 200 });
  } catch (error) {
    console.error("Failed to remove payment method:", error);

    return NextResponse.json(
      { error: "Failed to remove the payment method" },
      { status: 500 },
    );
  }
}
