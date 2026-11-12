import { NextResponse } from "next/server";
import { getStripe } from "@/lib/billing/stripe";
import { syncSubscription } from "@/lib/billing/syncSubscription";

// POST /api/billing/webhook
export async function POST(request: Request): Promise<NextResponse> {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  /*
   * Stripe signs every webhook. Checking the signature against the raw body
   * proves it came from Stripe and wasn't changed; anyone can POST here, so
   * nothing is trusted before this check passes.
   */
  let event;

  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      secret,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object.id);
        break;

      // Every other event is acknowledged and ignored.
      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    /*
     * A 500 makes Stripe retry the event later (for up to 3 days),
     * so a temporary database or Stripe error doesn't lose an update.
     */
    console.error(`Failed to handle Stripe event ${event.type}:`, error);

    return NextResponse.json(
      { error: "Failed to handle event" },
      { status: 500 },
    );
  }
}
