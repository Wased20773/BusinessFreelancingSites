import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getAppUrl,
  getOrCreateStripeCustomer,
  getStripe,
} from "@/lib/billing/stripe";

// POST /api/account/billing/payment-methods
// Starts a Stripe page that saves a card. Nothing is charged.
export async function POST(): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 },
      );
    }

    // Cards belong to the user, not a business. Someone who never paid
    // gets a Stripe customer here so they can add a card ahead of time.
    const customer = await getOrCreateStripeCustomer(session.user.id);
    const returnUrl = `${getAppUrl()}/settings/account/billing`;

    /*
     * Mode "setup" only saves the card; the number is typed on Stripe's
     * page. Cards only, so the list can always show brand and last 4.
     */
    const checkoutSession = await getStripe().checkout.sessions.create({
      mode: "setup",
      customer,
      allowed_payment_method_types: ["card"],
      success_url: `${returnUrl}?card=added`,
      cancel_url: `${returnUrl}?card=cancelled`,
    });

    return NextResponse.json({ url: checkoutSession.url }, { status: 200 });
  } catch (error) {
    console.error("Failed to start adding a card:", error);

    return NextResponse.json(
      { error: "Failed to start adding a card" },
      { status: 500 },
    );
  }
}
