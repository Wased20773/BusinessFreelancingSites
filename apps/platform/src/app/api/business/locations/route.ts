import { NextResponse } from "next/server";
import { getBusinessResponse } from "../../route_helper";
import { authenticateBusinessReadAccess } from "@/lib/auth/authenticateBusinessReadAccess";
import { AccessLevel } from "@business-freelancer/database";

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

// GET /api/business/locations
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const authentication = await authenticateBusinessReadAccess(request, [
      AccessLevel.developer,
      AccessLevel.owner,
      AccessLevel.admin,
      AccessLevel.staff,
    ]);

    if (authentication instanceof NextResponse) return authentication;

    const response = await getBusinessResponse(
      authentication.businessId,
      {
        locations: {
          orderBy: [
            {
              isActive: "desc",
            },
            {
              createdAt: "asc",
            },
          ],
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

                hours: {
                  orderBy: {
                    openTime: "asc",
                  },

                  select: {
                    id: true,
                    locationDayId: true,
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
        },
      },
      "location",
    );

    const data = await response.json();

    if (Array.isArray(data.locations)) {
      data.locations.forEach(
        (location: {
          days: {
            dayOfWeek: (typeof DAY_ORDER)[number];
          }[];
        }) => {
          location.days.sort(
            (a, b) =>
              DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek),
          );
        },
      );
    }

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to fetch business locations: ${error}`,
      },
      {
        status: 400,
      },
    );
  }
}
