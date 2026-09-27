import { NextResponse } from "next/server";
import { getLocationResponse, rateLimiterRead } from "../../../route_helper";
import { authenticateBusinessReadAccess } from "@/lib/auth/authenticateBusinessReadAccess";
import { AccessLevel } from "@business-freelancer/database";

// GET /api/business/categories/[categoryId]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ categoryId: string }> },
): Promise<NextResponse> {
  try {
    const { categoryId } = await params;

    if (!categoryId) {
      return NextResponse.json(
        { error: "Missing category id" },
        { status: 400 },
      );
    }

    const authentication = await authenticateBusinessReadAccess(request, [
      AccessLevel.developer,
      AccessLevel.owner,
      AccessLevel.admin,
      AccessLevel.staff,
    ]);

    if (authentication instanceof NextResponse) return authentication;

    const rateLimit = await rateLimiterRead(authentication);

    if (rateLimit instanceof NextResponse) return rateLimit;

    return await getLocationResponse(
      authentication.businessId,
      authentication.locationId,
      {
        categories: {
          // Parent category at the root level.
          where: { id: categoryId },
          select: {
            id: true,
            locationId: true,
            parentId: true,
            name: true,
            description: true,
            order: true,
            isVisible: true,

            ...(authentication.authenticationType === "session"
              ? { syncGroupId: true, isSynced: true }
              : {}),

            createdAt: true,
            updatedAt: true,

            // Parent category items
            items: {
              orderBy: {
                order: "asc",
              },

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
                createdAt: true,
                updatedAt: true,

                options: {
                  orderBy: {
                    order: "asc",
                  },

                  select: {
                    id: true,
                    itemId: true,
                    name: true,
                    price: true,
                    order: true,
                    isAvailable: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
              },
            },

            // Child categories
            subcategories: {
              orderBy: {
                order: "asc",
              },

              select: {
                id: true,
                locationId: true,
                parentId: true,
                name: true,
                description: true,
                order: true,
                isVisible: true,
                createdAt: true,
                updatedAt: true,

                ...(authentication.authenticationType === "session"
                  ? { syncGroupId: true, isSynced: true }
                  : {}),

                // Items belonging to this subcategory
                items: {
                  orderBy: {
                    order: "asc",
                  },

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
                    createdAt: true,
                    updatedAt: true,

                    options: {
                      orderBy: {
                        order: "asc",
                      },

                      select: {
                        id: true,
                        itemId: true,
                        name: true,
                        price: true,
                        order: true,
                        isAvailable: true,
                        createdAt: true,
                        updatedAt: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "category",
    );
  } catch (error) {
    console.error("Failed to fetch category:", error);

    return NextResponse.json(
      { error: `Failed to fetch category: ${error}` },
      { status: 400 },
    );
  }
}
