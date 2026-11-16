import { getNextOrder, isUniqueConstraintError } from "@/app/api/route_helper";
import {
  ADD_ON_SELECT,
  checkLocationAccess,
  MANAGE_LEVELS,
  readAddOnFields,
} from "@/lib/addOns/addOnRoutes";
import { allowSync } from "@/lib/billing/sync";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/businesses/[businessId]/locations/[locationId]/add-on-groups/[groupId]/add-ons
// Synced: the add-on is created in every synced copy of its group.
export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ businessId: string; locationId: string; groupId: string }>;
  },
): Promise<NextResponse> {
  try {
    const { businessId, locationId, groupId } = await params;
    const accessError = await checkLocationAccess(
      request,
      businessId,
      locationId,
      MANAGE_LEVELS,
    );

    if (accessError) return accessError;

    const body = await request.json();
    const addOn = readAddOnFields(body);

    if ("error" in addOn) {
      return NextResponse.json({ error: addOn.error }, { status: 400 });
    }

    if (typeof body.isSynced !== "boolean") {
      return NextResponse.json(
        { error: "Synchronization setting was not found" },
        { status: 400 },
      );
    }

    const isSynced = await allowSync(businessId, body.isSynced);

    const group = await prisma.addOnGroup.findFirst({
      where: { id: groupId, locationId },
      select: { id: true, syncGroupId: true },
    });

    if (!group) {
      return NextResponse.json(
        { error: "This add-on group does not exist in our records" },
        { status: 404 },
      );
    }

    if (!isSynced) {
      const nextOrder = await getNextOrder(prisma.addOn, { groupId: group.id });

      if (nextOrder instanceof NextResponse) return nextOrder;

      const created = await prisma.addOn.create({
        data: {
          ...addOn.fields,
          locationId,
          groupId: group.id,
          order: nextOrder,
          syncGroupId: null,
          isSynced: false,
        },
        select: ADD_ON_SELECT,
      });

      return NextResponse.json(created, { status: 201 });
    }

    if (!group.syncGroupId) {
      return NextResponse.json(
        {
          error:
            "This add-on group is not synced, so its add-ons can't be synced",
        },
        { status: 400 },
      );
    }

    // This group and its synced copies at the other locations.
    const groups = await prisma.addOnGroup.findMany({
      where: {
        syncGroupId: group.syncGroupId,
        OR: [{ isSynced: true }, { id: group.id }],
      },
      select: {
        id: true,
        locationId: true,
        addOns: {
          orderBy: { order: "desc" },
          take: 1,
          select: { order: true },
        },
      },
    });

    const syncGroupId = crypto.randomUUID();
    const rows = groups.map((targetGroup) => ({
      ...addOn.fields,
      id: crypto.randomUUID(),
      locationId: targetGroup.locationId,
      groupId: targetGroup.id,
      order: (targetGroup.addOns[0]?.order ?? 0) + 1,
      syncGroupId,
      isSynced: true,
    }));

    const created = await prisma.addOn.createMany({ data: rows });

    return NextResponse.json(
      {
        message: "Synchronized add-ons created successfully",
        count: created.count,
        id: rows.find((row) => row.groupId === group.id)?.id,
        syncGroupId,
      },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          error:
            "An add-on with this name already exists in this group at one or more locations",
        },
        { status: 409 },
      );
    }

    console.error("Failed to create add-on:", error);

    return NextResponse.json(
      { error: "Failed to create add-on" },
      { status: 500 },
    );
  }
}
