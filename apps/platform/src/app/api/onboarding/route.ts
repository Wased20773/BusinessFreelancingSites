import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingIntent } from "@business-freelancer/database/generated/prisma/enums";

// PATCH /api/onboarding
export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const onboardingIntent = body.onboardingIntent as OnboardingIntent;

    if (!Object.values(OnboardingIntent).includes(onboardingIntent)) {
      return NextResponse.json(
        { error: "Invalid onboarding intent" },
        { status: 400 },
      );
    }

    const user = await prisma.user.update({
      where: {
        email: session.user.email,
      },
      data: {
        onboardingIntent,
        onboardingCompleted: true,
      },
      select: {
        onboardingIntent: true,
        onboardingCompleted: true,
      },
    });

    return NextResponse.json(
      {
        message: "Onboarding completed successfully",
        user,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to complete onboarding:", error);

    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 },
    );
  }
}
