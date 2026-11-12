import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/*
 *   Only the person paying for a business can change or cancel its plan,
 *   since it's their card. Returns the business's subscription, or an
 *   error response to send back.
 **/
export async function requirePayer(businessId: string, userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { businessId },
    select: {
      payerId: true,
      stripeSubscriptionId: true,
      tier: true,
      status: true,
    },
  });

  if (!subscription) {
    return NextResponse.json(
      { error: "This business does not have a subscription" },
      { status: 404 },
    );
  }

  if (subscription.payerId !== userId) {
    return NextResponse.json(
      { error: "Only the person paying for this business can manage its plan" },
      { status: 403 },
    );
  }

  return subscription;
}
