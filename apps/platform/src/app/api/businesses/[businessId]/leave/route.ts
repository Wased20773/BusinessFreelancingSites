import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { cancelSubscriptionForDepartingPayer } from "@/lib/billing/cancelSubscription";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

// POST /api/businesses/[businessId]/leave
// The signed-in user leaves the business. Removing someone else goes
// through DELETE /api/businesses/[businessId]/users/[businessUserId].
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

    const authResult = await authenticateBusinessAccess(request, businessId, [
      AccessLevel.developer,
      AccessLevel.owner,
      AccessLevel.admin,
      AccessLevel.staff,
    ]);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    /*
     * A business always has exactly one owner, so the owner can't just
     * leave. They transfer ownership first, or delete the business.
     */
    if (authResult.accessLevel === AccessLevel.owner) {
      return NextResponse.json(
        {
          error:
            "The owner can't leave the business. Transfer ownership to another member first, or delete the business.",
        },
        { status: 403 },
      );
    }

    /*
     * If they pay for this business, stop their subscription at the end of
     * the paid month first, so they are never charged for a business they
     * left. If Stripe fails, this throws and they stay a member.
     */
    await cancelSubscriptionForDepartingPayer(businessId, authResult.userId);

    await prisma.businessUser.delete({
      where: {
        businessId_userId: { businessId, userId: authResult.userId },
      },
    });

    return NextResponse.json(
      { message: "You left the business" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to leave business:", error);

    return NextResponse.json(
      { error: "Failed to leave the business" },
      { status: 500 },
    );
  }
}
