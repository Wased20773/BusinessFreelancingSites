import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const CURRENT_TOUR_VERSION = 1;

// PATCH /api/user/workshop-tour
export async function PATCH() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      workspaceTourVersion: CURRENT_TOUR_VERSION,
    },
  });

  return NextResponse.json({
    workspaceTourVersion: CURRENT_TOUR_VERSION,
  });
}
