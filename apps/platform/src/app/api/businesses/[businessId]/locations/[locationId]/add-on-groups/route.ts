import { getNextOrder, isUniqueConstraintError } from "@/app/api/route_helper";
import {
  ADD_ON_GROUP_SELECT,
  ADD_ON_SELECT,
  checkLocationAccess,
  countItemsUsing,
  MANAGE_LEVELS,
  readGroupName,
  USAGE_SELECT,
  VIEW_LEVELS,
} from "@/lib/addOns/addOnRoutes";
import { allowSync } from "@/lib/billing/sync";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type LocationParams = {
  params: Promise<{ businessId: string; locationId: string }>;
};

// GET /api/businesses/[businessId]/locations/[locationId]/add-on-groups
// Every group with all its add-ons (available or not) and how many items
// use each add-on. For the Add-ons page and the item form's picker.
export async function GET(
  request: Request,
  { params }: LocationParams,
): Promise<NextResponse> {
  try {
    const { businessId, locationId } = await params;
    const accessError = await checkLocationAccess(
      request,
      businessId,
      locationId,
      VIEW_LEVELS,
    );

    if (accessError) return accessError;

    const groups = await prisma.addOnGroup.findMany({
      where: { locationId },
      orderBy: { order: "asc" },
      select: {
        ...ADD_ON_GROUP_SELECT,
        addOns: {
          orderBy: { order: "asc" },
          select: { ...ADD_ON_SELECT, ...USAGE_SELECT },
        },
      },
    });

    return NextResponse.json(
      {
        groups: groups.map((group) => ({
          ...group,
          addOns: group.addOns.map(({ itemLinks, optionLinks, ...addOn }) => ({
            ...addOn,
            usedByItems: countItemsUsing({ itemLinks, optionLinks }),
          })),
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to fetch add-on groups:", error);

    return NextResponse.json(
      { error: "Failed to fetch add-on groups" },
      { status: 500 },
    );
  }
}

// POST /api/businesses/[businessId]/locations/[locationId]/add-on-groups
// Synced: the group is created at every location of the business.
export async function POST(
  request: Request,
  { params }: LocationParams,
): Promise<NextResponse> {
  try {
    const { businessId, locationId } = await params;
    const accessError = await checkLocationAccess(
      request,
      businessId,
      locationId,
      MANAGE_LEVELS,
    );

    if (accessError) return accessError;

    const body = await request.json();
    const groupName = readGroupName(body);

    if ("error" in groupName) {
      return NextResponse.json({ error: groupName.error }, { status: 400 });
    }

    if (typeof body.isSynced !== "boolean") {
      return NextResponse.json(
        { error: "Synchronization setting was not found" },
        { status: 400 },
      );
    }

    const isSynced = await allowSync(businessId, body.isSynced);

    if (!isSynced) {
      const nextOrder = await getNextOrder(prisma.addOnGroup, { locationId });

      if (nextOrder instanceof NextResponse) return nextOrder;

      const group = await prisma.addOnGroup.create({
        data: {
          locationId,
          name: groupName.name,
          order: nextOrder,
          syncGroupId: null,
          isSynced: false,
        },
        select: ADD_ON_GROUP_SELECT,
      });

      return NextResponse.json(group, { status: 201 });
    }

    // Every location, each with its own next order.
    const locations = await prisma.location.findMany({
      where: { businessId },
      select: {
        id: true,
        addOnGroups: {
          orderBy: { order: "desc" },
          take: 1,
          select: { order: true },
        },
      },
    });

    const syncGroupId = crypto.randomUUID();

    const created = await prisma.addOnGroup.createMany({
      data: locations.map((location) => ({
        locationId: location.id,
        name: groupName.name,
        order: (location.addOnGroups[0]?.order ?? 0) + 1,
        syncGroupId,
        isSynced: true,
      })),
    });

    return NextResponse.json(
      {
        message: "Synchronized add-on groups created successfully",
        count: created.count,
        syncGroupId,
      },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          error:
            "An add-on group with this name already exists in one or more locations",
        },
        { status: 409 },
      );
    }

    console.error("Failed to create add-on group:", error);

    return NextResponse.json(
      { error: "Failed to create add-on group" },
      { status: 500 },
    );
  }
}
