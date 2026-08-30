import { getLocationResponse } from "../../route_helper";
import { authenticateBusinessReadAccess } from "@/lib/auth/authenticateBusinessReadAccess";
import { NextResponse } from "next/server";
import { AccessLevel } from "@business-freelancer/database";

// GET /api/business/menu
export async function GET(request: Request): Promise<NextResponse> {
  const authentication = await authenticateBusinessReadAccess(request, [
    AccessLevel.developer,
    AccessLevel.owner,
    AccessLevel.admin,
    AccessLevel.staff,
  ]);

  if (authentication instanceof NextResponse) return authentication;

  return await getLocationResponse(
    authentication.businessId,
    authentication.locationId,
    {
      categories: {
        // Only return parent categories at the root level.
        where: {
          parentId: null,
        },

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
    "menu",
  );
}
