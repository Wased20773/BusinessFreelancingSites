import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { PAID_STATUSES } from "./getBusinessPlan";

export type PayerLeftNotice = {
  payerName: string;
  endsAt: string; // ISO date the plan ends
};

/*
 *   For the owners' workspace banner: the payer left or was removed, so the
 *   plan stops at the end of the paid month unless someone takes over.
 *
 *   Returns null unless the viewer is an owner and that is the situation.
 **/
export async function getPayerLeftNotice(
  businessId: string,
  viewerUserId: string,
): Promise<PayerLeftNotice | null> {
  const [viewer, subscription] = await Promise.all([
    prisma.businessUser.findUnique({
      where: { businessId_userId: { businessId, userId: viewerUserId } },
      select: { role: { select: { accessLevel: true } } },
    }),
    prisma.subscription.findUnique({
      where: { businessId },
      select: {
        status: true,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: true,
        payer: {
          select: {
            name: true,
            email: true,
            businesses: { where: { businessId }, select: { id: true } },
          },
        },
      },
    }),
  ]);

  if (
    viewer?.role.accessLevel !== AccessLevel.owner ||
    !subscription ||
    !PAID_STATUSES.includes(subscription.status) ||
    !subscription.cancelAtPeriodEnd ||
    subscription.payer.businesses.length > 0
  ) {
    return null;
  }

  return {
    payerName: subscription.payer.name ?? subscription.payer.email,
    endsAt: subscription.currentPeriodEnd.toISOString(),
  };
}
