import { validateBusinessLocationParams } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

// GET /api/businesses/[businessId]/locations/[locationId]/overview
export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string; locationId: string }> },
): Promise<NextResponse> {
  try {
    const { businessId, locationId } = await params;
    const paramsError = validateBusinessLocationParams(businessId, locationId);

    if (paramsError) return paramsError;

    const authResult = await authenticateBusinessAccess(request, businessId, [
      AccessLevel.staff,
      AccessLevel.admin,
      AccessLevel.owner,
    ]);

    if (authResult instanceof NextResponse) return authResult;

    const overviewContent = await prisma.location.findUnique({
      where: {
        id: locationId,
        businessId: businessId,
      },
      select: {
        id: true,
        businessId: true,
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
            syncGroupId: true,
            createdAt: true,
            updatedAt: true,
            hour: {
              select: {
                id: true,
                openTime: true,
                closeTime: true,
                title: true,
                note: true,
                isDisabled: true,
                syncGroupId: true,
                isSynced: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },

        categories: {
          where: { parentId: null },
          orderBy: { order: "asc" },
          select: {
            id: true,
            locationId: true,
            name: true,
            description: true,
            order: true,
            isVisible: true,
            items: true,
            subcategories: true,
            syncGroupId: true,
            isSynced: true,
            createdAt: true,
            updatedAt: true,
          },
        },

        items: {
          select: {
            id: true,
            locationId: true,
            categoryId: true,
            name: true,
            description: true,
            containsList: true,
            calories: true,
            price: true,
            order: true,
            isAvailable: true,
            slug: true,
            imageKey: true,
            syncGroupId: true,
            isSynced: true,
            createdAt: true,
            updatedAt: true,
          },
        },

        contacts: {
          orderBy: [{ isPersonal: "asc" }, { createdAt: "desc" }],
          select: {
            id: true,
            locationId: true,
            phoneNumber: true,
            email: true,
            isPersonal: true,
            syncGroupId: true,
            isSynced: true,
            createdAt: true,
            updatedAt: true,
          },
        },

        socials: {
          select: {
            id: true,
            locationId: true,
            domain: true,
            profileName: true,
            url: true,
            icon: true,
            isSynced: true,
            syncGroupId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!overviewContent) {
      return NextResponse.json(
        { error: "The location could not be found for the overview content" },
        { status: 404 },
      );
    }

    overviewContent.days.sort(
      (a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek),
    );

    return NextResponse.json(overviewContent, { status: 200 });
  } catch (error) {
    console.error("Failed to get dashboard overview page contents:", error);

    return NextResponse.json(
      { error: "Failed to get dashboard overview page contents" },
      { status: 500 },
    );
  }
}
