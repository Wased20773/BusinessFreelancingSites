import { isUniqueConstraintError } from "@/app/api/route_helper";
import {
  ADD_ON_GROUP_SELECT,
  checkLocationAccess,
  MANAGE_LEVELS,
  readGroupName,
  renumberGroups,
} from "@/lib/addOns/addOnRoutes";
import { allowSync } from "@/lib/billing/sync";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type GroupParams = {
  params: Promise<{ businessId: string; locationId: string; groupId: string }>;
};

// PATCH /api/businesses/[businessId]/locations/[locationId]/add-on-groups/[groupId]
// Renames the group. Synced: every synced copy is renamed too.
export async function PATCH(
  request: Request,
  { params }: GroupParams,
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

    if (group.syncGroupId && isSynced) {
      await prisma.addOnGroup.updateMany({
        where: {
          syncGroupId: group.syncGroupId,
          // Synced copies, plus this group even if it was unsynced.
          OR: [{ isSynced: true }, { id: group.id }],
        },
        data: { name: groupName.name, isSynced: true },
      });
    } else {
      await prisma.addOnGroup.update({
        where: { id: group.id },
        data: { name: groupName.name, isSynced: false },
      });
    }

    const updated = await prisma.addOnGroup.findFirst({
      where: { id: group.id, locationId },
      select: ADD_ON_GROUP_SELECT,
    });

    return NextResponse.json(updated, { status: 200 });
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

    console.error("Failed to update add-on group:", error);

    return NextResponse.json(
      { error: "Failed to update add-on group" },
      { status: 500 },
    );
  }
}

// DELETE /api/businesses/[businessId]/locations/[locationId]/add-on-groups/[groupId]
// Deletes the group, its add-ons, and every item's links to them. Unlike
// categories this is allowed with add-ons inside; the dashboard warns first.
export async function DELETE(
  request: Request,
  { params }: GroupParams,
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

    if (typeof body.deleteAllSynced !== "boolean") {
      return NextResponse.json(
        { error: "Delete synchronization option was not found" },
        { status: 400 },
      );
    }

    const deleteAllSynced = await allowSync(businessId, body.deleteAllSynced);

    const group = await prisma.addOnGroup.findFirst({
      where: { id: groupId, locationId },
      select: { id: true, locationId: true, syncGroupId: true },
    });

    if (!group) {
      return NextResponse.json(
        { error: "This add-on group does not exist in our records" },
        { status: 404 },
      );
    }

    const groupsToDelete =
      group.syncGroupId && deleteAllSynced
        ? await prisma.addOnGroup.findMany({
            where: {
              syncGroupId: group.syncGroupId,
              OR: [{ isSynced: true }, { id: group.id }],
            },
            select: { id: true, locationId: true },
          })
        : [group];

    await prisma.$transaction(async (tx) => {
      // Add-ons and their item links go with the group (cascade).
      await tx.addOnGroup.deleteMany({
        where: { id: { in: groupsToDelete.map((deleted) => deleted.id) } },
      });

      const locationIds = new Set(
        groupsToDelete.map((deleted) => deleted.locationId),
      );

      for (const affectedLocationId of locationIds) {
        await renumberGroups(tx, affectedLocationId);
      }
    });

    return NextResponse.json(
      {
        message:
          groupsToDelete.length > 1
            ? "Synchronized add-on groups deleted successfully"
            : "Add-on group deleted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete add-on group:", error);

    return NextResponse.json(
      { error: "Failed to delete add-on group" },
      { status: 500 },
    );
  }
}
