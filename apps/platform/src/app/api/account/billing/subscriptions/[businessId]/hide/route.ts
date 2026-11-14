import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

// POST /api/account/billing/subscriptions/[businessId]/hide
// A payer removed from a business hides its plan from their Settings →
// Billing. Only hides it: the plan still runs until it ends.
export async function POST(
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

    const userId = session.user.id;
    const { businessId } = await params;

    const subscription = await prisma.subscription.findUnique({
      where: { businessId },
      select: {
        payerId: true,
        business: {
          select: { users: { where: { userId }, select: { id: true } } },
        },
      },
    });

    if (!subscription || subscription.payerId !== userId) {
      return NextResponse.json(
        { error: "You don't pay for this business" },
        { status: 404 },
      );
    }

    // A member still manages the plan from the business, so it stays listed.
    if (subscription.business.users.length > 0) {
      return NextResponse.json(
        { error: "You're still in this business. Manage the plan there." },
        { status: 409 },
      );
    }

    await prisma.subscription.update({
      where: { businessId },
      data: { hiddenByPayer: true },
    });

    return NextResponse.json({ hidden: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to hide the subscription:", error);

    return NextResponse.json(
      { error: "Failed to hide the subscription" },
      { status: 500 },
    );
  }
}
