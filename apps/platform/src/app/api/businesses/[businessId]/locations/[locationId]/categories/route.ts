import {
  getNextOrder,
  validateBusinessLocationParams,
} from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// POST /api/businesses/[businessId]/locations/[locationId]/categories
export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      businessId: string;
      locationId: string;
    }>;
  },
): Promise<NextResponse> {
  try {
    const { businessId, locationId } = await params;
    const paramsError = validateBusinessLocationParams(businessId, locationId);

    if (paramsError) return paramsError;

    const authResult = await authenticateBusinessAccess(request, businessId, [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "Missing category name" },
        { status: 400 },
      );
    }

    if (typeof body.isSynced !== "boolean") {
      return NextResponse.json(
        { error: "Synchronization setting was not found" },
        { status: 400 },
      );
    }

    // ############################
    // ##### SINGLE LOCATION ######
    // ############################

    if (!body.isSynced) {
      const nextOrder = await getNextOrder(prisma.category, {
        locationId,
        parentId: null,
      });

      if (nextOrder instanceof NextResponse) {
        return nextOrder;
      }

      const category = await prisma.category.create({
        data: {
          locationId,
          name: body.name,
          description: body.description,
          order: nextOrder,
          syncGroupId: null,
          isSynced: false,
        },
        select: {
          id: true,
          locationId: true,
          name: true,
          description: true,
          order: true,
          isVisible: true,
          syncGroupId: true,
          isSynced: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return NextResponse.json(category, {
        status: 201,
      });
    }

    // ############################
    // ##### SYNCHRONIZED #########
    // ############################

    /*
     * Get every location belonging to this business.
     *
     * We also grab each location's highest top-level
     * Category order so every new Category can be placed
     * correctly within its own location.
     */
    const locations = await prisma.location.findMany({
      where: {
        businessId,
      },
      select: {
        id: true,

        categories: {
          where: {
            parentId: null,
          },
          orderBy: {
            order: "desc",
          },
          take: 1,
          select: {
            order: true,
          },
        },
      },
    });

    if (locations.length === 0) {
      return NextResponse.json(
        {
          error: "No locations were found for this business",
        },
        { status: 400 },
      );
    }

    /*
     * One logical Category across every location,
     * so every copy gets the same syncGroupId.
     */
    const syncGroupId = crypto.randomUUID();

    const createdCategories = await prisma.category.createMany({
      data: locations.map((location) => ({
        locationId: location.id,
        name: body.name,
        description: body.description,

        /*
         * Ordering belongs to the individual location.
         */
        order: (location.categories[0]?.order ?? 0) + 1,

        syncGroupId,
        isSynced: true,
      })),
    });

    return NextResponse.json(
      {
        message: "Synchronized categories created successfully",
        count: createdCategories.count,
        syncGroupId,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create category:", error);

    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}
