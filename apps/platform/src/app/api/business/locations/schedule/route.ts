import { NextResponse } from "next/server";
import { AccessLevel } from "@business-freelancer/database";
import { authenticateBusinessReadAccess } from "@/lib/auth/authenticateBusinessReadAccess";
import { prisma } from "@/lib/prisma";
import { rateLimiterRead } from "@/app/api/route_helper";

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

// GET /api/business/locations/schedule
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const authentication = await authenticateBusinessReadAccess(request, [
      AccessLevel.developer,
      AccessLevel.owner,
      AccessLevel.admin,
      AccessLevel.staff,
    ]);

    if (authentication instanceof NextResponse) {
      return authentication;
    }

    const rateLimit = await rateLimiterRead(authentication);

    if (rateLimit instanceof NextResponse) return rateLimit;

    const { locationId } = await authentication;

    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        businessId: authentication.businessId,
      },
      select: {
        id: true,
        address: true,
        zip: true,
        country: true,
        state: true,
        city: true,
        parking: true,
        isActive: true,
        enableHours: true,
        createdAt: true,
        updatedAt: true,
        days: {
          select: {
            id: true,
            locationId: true,
            dayOfWeek: true,
            isClosed: true,
            createdAt: true,
            updatedAt: true,
            hour: {
              select: {
                id: true,
                regularDayId: true,
                openTime: true,
                closeTime: true,
                title: true,
                note: true,
                isDisabled: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            specialHours: {
              orderBy: {
                openTime: "asc",
              },
              select: {
                id: true,
                specialDayId: true,
                openTime: true,
                closeTime: true,
                title: true,
                note: true,
                isDisabled: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found while fetching schedule data" },
        { status: 404 },
      );
    }

    location.days.sort(
      (a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek),
    );

    return NextResponse.json(location, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch location schedule:", error);

    return NextResponse.json(
      { error: "Failed to fetch location schedule" },
      { status: 500 },
    );
  }
}
