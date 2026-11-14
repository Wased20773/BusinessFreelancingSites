import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { PlanTier } from "@business-freelancer/database/generated/prisma/enums";
import { auth } from "@/auth";
import {
  getLocationSlotPriceId,
  getPriceIdForTier,
  getStripe,
} from "@/lib/billing/stripe";

// Stripe stores amounts in cents.
function toPriceJson(price: Stripe.Price) {
  return { amount: (price.unit_amount ?? 0) / 100, currency: price.currency };
}

// GET /api/billing/prices
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized Access" },
        { status: 401 },
      );
    }

    const stripe = getStripe();
    const tiers = Object.values(PlanTier);

    /*
     * Prices live in Stripe, so the page always shows what Stripe will
     * actually charge, even after a price is changed in the dashboard.
     */
    const [tierPrices, slotPrice] = await Promise.all([
      Promise.all(
        tiers.map((tier) => stripe.prices.retrieve(getPriceIdForTier(tier))),
      ),
      stripe.prices.retrieve(getLocationSlotPriceId()),
    ]);

    return NextResponse.json(
      {
        tiers: Object.fromEntries(
          tiers.map((tier, index) => [tier, toPriceJson(tierPrices[index])]),
        ),
        locationSlot: toPriceJson(slotPrice),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to load prices:", error);

    return NextResponse.json(
      { error: "Failed to load prices" },
      { status: 500 },
    );
  }
}
