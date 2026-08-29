import {
  createSlug,
  getNextOrder,
  validateBusinessLocationParams,
} from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// POST /api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]/items
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
      return NextResponse.json({ error: "Missing item name" }, { status: 400 });
    }

    if (body.price === undefined || body.price === null) {
      return NextResponse.json(
        { error: "Missing item price" },
        { status: 400 },
      );
    }

    if (typeof body.isSynced !== "boolean") {
      return NextResponse.json(
        { error: "Synchronization setting was not found" },
        { status: 400 },
      );
    }

    const slug = createSlug(body.name);

    /*
     * Get the selected parent Category.
     *
     * We need its syncGroupId so synchronized Items can
     * be attached to the corresponding Category at each location.
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
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "This category does not exist in our records" },
        { status: 400 },
      );
    }

    // ############################
    // ##### SINGLE LOCATION ######
    // ############################

    if (!body.isSynced) {
      /*
       * Item slugs are unique within the location.
       */
      const existingItem = await prisma.item.findFirst({
        where: {
          locationId,
          slug,
        },
        select: {
          id: true,
        },
      });

      if (existingItem) {
        return NextResponse.json(
          { error: "An item with this name already exists in this location" },
          { status: 409 },
        );
      }

      const nextOrder = await getNextOrder(prisma.item, {
        categoryId: category.id,
      });

      if (nextOrder instanceof NextResponse) {
        return nextOrder;
      }

      const item = await prisma.item.create({
        data: {
          locationId,
          categoryId: category.id,
          name: body.name,
          description: body.description,
          containsList: body.containsList,
          calories: body.calories,
          price: body.price,
          order: nextOrder,
          isAvailable: body.isAvailable,
          slug,
          syncGroupId: null,
          isSynced: false,
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
          syncGroupId: true,
          isSynced: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return NextResponse.json(item, {
        status: 201,
      });
    }

    // ############################
    // ##### SYNCHRONIZED #########
    // ############################

    /*
     * The Item cannot be copied to corresponding Categories
     * if the selected parent has no synchronization group.
     */
    if (!category.syncGroupId) {
      return NextResponse.json(
        { error: "This category does not belong to a synchronization group" },
        { status: 400 },
      );
    }

    /*
     * Find the corresponding parent Categories at each location.
     *
     * Include:
     * - currently synced Categories
     * - the selected Category itself
     *
     * This allows an Item to be created from the selected
     * Category even if that Category currently has isSynced false.
     */
    const parentCategories = await prisma.category.findMany({
      where: {
        syncGroupId: category.syncGroupId,

        OR: [{ isSynced: true }, { id: category.id }],
      },
      select: {
        id: true,
        locationId: true,
      },
    });

    /*
     * Before creating anything, make sure this Item slug
     * does not already exist at any participating location.
     *
     * This prevents createMany from partially conflicting
     * with location-level Item slug uniqueness.
     */
    const existingItem = await prisma.item.findFirst({
      where: {
        slug,
        locationId: {
          in: parentCategories.map(
            (parentCategory) => parentCategory.locationId,
          ),
        },
      },
      select: {
        id: true,
      },
    });

    if (existingItem) {
      return NextResponse.json(
        {
          error:
            "An item with this name already exists in one or more synchronized locations",
        },
        { status: 409 },
      );
    }

    /*
     * Get each parent's current highest Item order in one query.
     *
     * Ordering stays completely independent between locations.
     */
    const existingOrders = await prisma.item.groupBy({
      by: ["categoryId"],
      where: {
        categoryId: {
          in: parentCategories.map((parentCategory) => parentCategory.id),
        },
      },
      _max: {
        order: true,
      },
    });

    const orderByCategoryId = new Map(
      existingOrders.map((result) => [
        result.categoryId,
        result._max.order ?? 0,
      ]),
    );

    /*
     * One logical Item across the participating locations.
     */
    const syncGroupId = crypto.randomUUID();

    const itemsToCreate = parentCategories.map((parentCategory) => ({
      id: crypto.randomUUID(),
      locationId: parentCategory.locationId,
      categoryId: parentCategory.id,
      name: body.name,
      description: body.description,
      containsList: body.containsList,
      calories: body.calories,
      price: body.price,

      /*
       * Each parent Category receives its own next order.
       */
      order: (orderByCategoryId.get(parentCategory.id) ?? 0) + 1,

      isAvailable: body.isAvailable,
      slug,
      syncGroupId,
      isSynced: true,
    }));

    /**
     * Grab the Item ID for the location the user is currently
     * working inside.
     */
    const selectedItem = itemsToCreate.find(
      (item) => item.locationId === locationId,
    );

    if (!selectedItem) {
      return NextResponse.json(
        { error: "Failed to determine the selected location item" },
        { status: 500 },
      );
    }

    const createdItems = await prisma.item.createMany({
      data: itemsToCreate,
    });

    return NextResponse.json(
      {
        message: "Synchronized category items created successfully",
        count: createdItems.count,
        id: selectedItem.id,
        syncGroupId,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create category item:", error);

    return NextResponse.json(
      { error: "Failed to create category item" },
      { status: 500 },
    );
  }
}
