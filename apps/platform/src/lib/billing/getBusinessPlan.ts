import { prisma } from "@/lib/prisma";
import type { SubscriptionStatus } from "@business-freelancer/database/generated/prisma/enums";
import { LOCATION_SLOTS, PLANS, type PlanKey } from "./plans";
import { NextResponse } from "next/server";

/*
 *   Statuses that keep the paid tier's limits.
 *   past_due = grace period (Stripe is retrying the card), so it stays paid.
 *   Everything else (canceled, unpaid, incomplete, paused...) falls back to Free.
 **/
const PAID_STATUSES: SubscriptionStatus[] = ["active", "trialing", "past_due"];

export async function getBusinessPlan(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      subscription: { select: { tier: true, status: true } },
      _count: {
        select: { slotPurchases: { where: { revokedAt: null } } },
      },
    },
  });

  const subscription = business?.subscription;

  const planKey: PlanKey =
    subscription && PAID_STATUSES.includes(subscription.status)
      ? subscription.tier
      : "free";

  return {
    planKey,
    limits: PLANS[planKey],
    locationSlots:
      LOCATION_SLOTS.included + (business?._count.slotPurchases ?? 0),
  };
}

export function planLimitResponse(message: string) {
  return NextResponse.json(
    { error: message, code: "PLAN_LIMIT" },
    { status: 403 },
  );
}
