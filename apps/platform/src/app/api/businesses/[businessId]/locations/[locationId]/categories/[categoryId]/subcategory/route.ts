import {
  getNextOrder,
  validateBusinessLocationParams,
} from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// POST /api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]/subcategory
export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      businessId: string;
      locationId: string;
      categoryId: string;
    }>;
  },
): Promise<NextResponse> {
  try {
    const { businessId, locationId, categoryId } = await params;
    const paramsError = validateBusinessLocationParams(businessId, locationId);

    if (paramsError) return paramsError;

    if (!categoryId) {
      return NextResponse.json(
        { error: "Missing categoryId" },
        { status: 400 },
      );
    }

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

    /*
     * Get the selected parent Category.
     *
     * parentId must be null because we currently only allow
     * subcategories to be created under a top-level Category.
     */
    const parentCategory = await prisma.category.findFirst({
      where: {
        id: categoryId,
        locationId,
        parentId: null,
      },
      select: {
        id: true,
        syncGroupId: true,
      },
    });

    if (!parentCategory) {
      return NextResponse.json(
        {
          error:
            "Either the category does not exist in our records or the selected category is already a subcategory",
        },
        { status: 400 },
      );
    }

    // ############################
    // ##### SINGLE LOCATION ######
    // ############################

    if (!body.isSynced) {
      const nextOrder = await getNextOrder(prisma.category, {
        locationId,
        parentId: parentCategory.id,
      });

      if (nextOrder instanceof NextResponse) {
        return nextOrder;
      }

      const subCategory = await prisma.category.create({
        data: {
          locationId,
          parentId: parentCategory.id,
          name: body.name,
          description: body.description,
          order: nextOrder,
          syncGroupId: null,
          isSynced: false,
        },
        select: {
          id: true,
          locationId: true,
          parentId: true,
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

      return NextResponse.json(subCategory, {
        status: 201,
      });
    }

    // ############################
    // ##### SYNCHRONIZED #########
    // ############################

    /*
     * We cannot synchronize the new subcategory to other
     * locations if its parent Category has no sync group.
     */
    if (!parentCategory.syncGroupId) {
      return NextResponse.json(
        {
          error: "This category does not belong to a synchronization group",
        },
        { status: 400 },
      );
    }

    /*
     * Find every corresponding parent Category.
     *
     * Include:
     * - currently synced parent Categories
     * - the selected parent itself
     *
     * The selected parent could currently have isSynced = false.
     */
    const parentCategories = await prisma.category.findMany({
      where: {
        syncGroupId: parentCategory.syncGroupId,
        parentId: null,

        OR: [
          {
            isSynced: true,
          },
          {
            id: parentCategory.id,
          },
        ],
      },
      select: {
        id: true,
        locationId: true,
      },
    });

    /*
     * Get the highest existing subcategory order for each
     * corresponding parent in ONE query.
     */
    const existingOrders = await prisma.category.groupBy({
      by: ["parentId"],
      where: {
        parentId: {
          in: parentCategories.map((parent) => parent.id),
        },
      },
      _max: {
        order: true,
      },
    });

    const orderByParentId = new Map(
      existingOrders.map((result) => [result.parentId, result._max.order ?? 0]),
    );

    /*
     * One logical subcategory across every participating
     * parent Category.
     */
    const syncGroupId = crypto.randomUUID();

    const createdSubCategories = await prisma.category.createMany({
      data: parentCategories.map((parent) => ({
        locationId: parent.locationId,
        parentId: parent.id,
        name: body.name,
        description: body.description,
        order: (orderByParentId.get(parent.id) ?? 0) + 1,
        syncGroupId,
        isSynced: true,
      })),
    });

    return NextResponse.json(
      {
        message: "Synchronized subcategories created successfully",
        count: createdSubCategories.count,
        syncGroupId,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to add a subcategory:", error);

    return NextResponse.json(
      { error: "Failed to add a subcategory" },
      { status: 500 },
    );
  }
}
