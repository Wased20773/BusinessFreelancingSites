import {
  updateSyncedResource,
  validateBusinessLocationParams,
} from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel, Prisma } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]
export async function PATCH(
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

    return await updateSyncedResource({
      body,
      model: prisma.category,
      resourceName: "category",
      id: categoryId,
      locationId,
      data: {
        name: body.name,
        description: body.description,
        isVisible: body.isVisible,
        isSynced: body.isSynced,
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
        updatedAt: true,
      },
    });
  } catch (error) {
    console.error("Failed to update category:", error);

    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 },
    );
  }
}

// DELETE /api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]
export async function DELETE(
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

    if (typeof body.deleteAllSynced !== "boolean") {
      return NextResponse.json(
        { error: "Delete synchronization option was not found" },
        { status: 400 },
      );
    }

    /*
     * Get the selected category first so we know:
     *
     * - whether it belongs to a synchronization group
     * - whether it still has items attached
     */
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        locationId,
      },
      select: {
        id: true,
        locationId: true,
        syncGroupId: true,
        items: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "This category does not exist in our records" },
        { status: 400 },
      );
    }

    /*
     * #############################
     * ##### DELETE ALL SYNCED #####
     * #############################
     *
     * This option only has an effect when the selected
     * category actually belongs to a synchronization group.
     */
    if (category.syncGroupId && body.deleteAllSynced === true) {
      /*
       * Get the categories that would be deleted.
       *
       * As with our other sync behavior:
       * - include currently synced categories
       * - always include the selected category itself
       */
      const categoriesToDelete = await prisma.category.findMany({
        where: {
          syncGroupId: category.syncGroupId,

          OR: [{ isSynced: true }, { id: category.id }],
        },
        select: {
          id: true,
          locationId: true,

          items: {
            select: {
              id: true,
            },
          },
        },
      });

      /*
       * Do not partially delete the synchronized group
       * if one of its categories still contains items.
       */
      const categoryWithItems = categoriesToDelete.find(
        (selectedCategory) => selectedCategory.items.length > 0,
      );

      if (categoryWithItems) {
        return NextResponse.json(
          {
            error:
              "These categories cannot be deleted because one or more still have items attached",
          },
          { status: 409 },
        );
      }

      /*
       * Save the affected locations before deleting.
       * We need them afterward to rebuild Category order.
       */
      const affectedLocationIds = [
        ...new Set(
          categoriesToDelete.map(
            (selectedCategory) => selectedCategory.locationId,
          ),
        ),
      ];

      /*
       * deleteMany is one statement, so if a category
       * still has a protected subcategory relation,
       * the operation will fail instead of partially
       * deleting the synchronized group.
       */
      await prisma.category.deleteMany({
        where: {
          id: {
            in: categoriesToDelete.map(
              (selectedCategory) => selectedCategory.id,
            ),
          },
        },
      });

      /*
       * Rebuild top-level Category order separately
       * for every affected location.
       */
      for (const affectedLocationId of affectedLocationIds) {
        const remainingCategories = await prisma.category.findMany({
          where: {
            locationId: affectedLocationId,
            parentId: null,
          },
          orderBy: {
            order: "asc",
          },
          select: {
            id: true,
          },
        });

        await prisma.$transaction(
          remainingCategories.map((remainingCategory, index) =>
            prisma.category.update({
              where: {
                id: remainingCategory.id,
              },
              data: {
                order: index + 1,
              },
            }),
          ),
        );
      }

      return NextResponse.json(
        { message: "Synchronized categories deleted successfully" },
        { status: 200 },
      );
    }

    /*
     * #############################
     * ##### SINGLE DELETE #########
     * #############################
     */

    if (category.items.length > 0) {
      return NextResponse.json(
        {
          error:
            "This category cannot be deleted because it still has items attached to it",
        },
        { status: 409 },
      );
    }

    await prisma.category.delete({
      where: {
        id: category.id,
        locationId,
      },
    });

    /*
     * Reorganize only this location's top-level categories.
     */
    const remainingCategories = await prisma.category.findMany({
      where: {
        locationId,
        parentId: null,
      },
      orderBy: {
        order: "asc",
      },
      select: {
        id: true,
      },
    });

    await prisma.$transaction(
      remainingCategories.map((remainingCategory, index) =>
        prisma.category.update({
          where: {
            id: remainingCategory.id,
          },
          data: {
            order: index + 1,
          },
        }),
      ),
    );

    return NextResponse.json(
      { message: "Category deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    /*
     * Preserve the existing protection against deleting
     * a Category while it still owns subcategories.
     */
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        {
          error:
            "This category cannot be deleted while it still has subcategories.",
        },
        { status: 409 },
      );
    }

    console.error("Failed to delete category:", error);

    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 },
    );
  }
}
