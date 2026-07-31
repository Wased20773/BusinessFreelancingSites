import {
  authenticateBusinessReadAccess,
  getBusinessResponse,
} from "../../route_helper";
import { NextResponse } from "next/server";
import { AccessLevel } from "@business-freelancer/database";

// GET /api/business/menu
export async function GET(request: Request) {
  const authentication = await authenticateBusinessReadAccess(request, [
    AccessLevel.developer,
    AccessLevel.owner,
    AccessLevel.admin,
    AccessLevel.staff,
  ]);

  if (authentication instanceof NextResponse) return authentication;

  return await getBusinessResponse(
    authentication.businessId,
    {
      categories: {
        where: { parentId: null },
        orderBy: {
          order: "asc",
        },
        select: {
          id: true,
          name: true,
          description: true,
          order: true,
          isVisible: true,
          createdAt: true,
          updatedAt: true,
          items: {
            orderBy: {
              order: "asc",
            },
            select: {
              id: true,
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
    "menu",
  );
}
