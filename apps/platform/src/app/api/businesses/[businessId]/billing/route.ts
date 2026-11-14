import { NextResponse } from "next/server";
import { AccessLevel } from "@business-freelancer/database";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { getBusinessPlan } from "@/lib/billing/getBusinessPlan";
import { LOCATION_SLOTS } from "@/lib/billing/plans";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

// GET /api/businesses/[businessId]/billing
export async function GET(
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

    const [plan, business] = await Promise.all([
      getBusinessPlan(businessId),
      prisma.business.findUnique({
        where: { id: businessId },
        select: {
          subscription: {
            select: {
              tier: true,
              status: true,
              currentPeriodEnd: true,
              cancelAtPeriodEnd: true,
              payer: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
          _count: {
            select: { locations: true, users: true, apiKeys: true },
          },
        },
      }),
    ]);

    if (!business) {
      return NextResponse.json(
        { error: "This business does not exist in our records" },
        { status: 404 },
      );
    }

    const { subscription } = business;

    return NextResponse.json(
      {
        planKey: plan.planKey,
        limits: plan.limits,
        usage: {
          locations: business._count.locations,
          locationSlots: plan.locationSlots,
          members: business._count.users,
          apiKeys: business._count.apiKeys,
        },
        selfServeSlotCap: LOCATION_SLOTS.selfServeCap,
        subscription: subscription && {
          tier: subscription.tier,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          payer: subscription.payer,
          isPayer: subscription.payer.id === authentication.userId,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to load billing:", error);

    return NextResponse.json(
      { error: "Failed to load billing" },
      { status: 500 },
    );
  }
}
