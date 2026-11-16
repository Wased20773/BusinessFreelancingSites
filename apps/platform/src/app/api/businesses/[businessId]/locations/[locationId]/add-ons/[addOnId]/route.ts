import { isUniqueConstraintError } from "@/app/api/route_helper";
import {
  ADD_ON_SELECT,
  checkLocationAccess,
  MANAGE_LEVELS,
  readAddOnFields,
  renumberAddOns,
} from "@/lib/addOns/addOnRoutes";
import { allowSync } from "@/lib/billing/sync";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type AddOnParams = {
  params: Promise<{ businessId: string; locationId: string; addOnId: string }>;
};

// The group isn't synced, so the add-on can't be either.
class GroupNotSyncedError extends Error {}

// PATCH /api/businesses/[businessId]/locations/[locationId]/add-ons/[addOnId]
//
// - Synced add-on, saved synced: every synced copy changes.
// - Unsynced add-on (never synced), saved synced: it joins the other
//   locations, a copy is added to each synced copy of its group.
// - Saved unsynced: only this location's add-on changes; it keeps its
//   syncGroupId so it can rejoin later.
export async function PATCH(
  request: Request,
  { params }: AddOnParams,
): Promise<NextResponse> {
  try {
    const { businessId, locationId, addOnId } = await params;
    const accessError = await checkLocationAccess(
      request,
      businessId,
      locationId,
      MANAGE_LEVELS,
    );

    if (accessError) return accessError;

    const body = await request.json();
    const parsed = readAddOnFields(body);

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    if (typeof body.isSynced !== "boolean") {
      return NextResponse.json(
        { error: "Synchronization setting was not found" },
        { status: 400 },
      );
    }

    const isSynced = await allowSync(businessId, body.isSynced);
    const { fields } = parsed;

    const addOn = await prisma.addOn.findFirst({
      where: { id: addOnId, locationId },
      select: {
        id: true,
        groupId: true,
        syncGroupId: true,
        group: { select: { syncGroupId: true } },
      },
    });

    if (!addOn) {
      return NextResponse.json(
        { error: "This add-on does not exist in our records" },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      if (isSynced && addOn.syncGroupId) {
        await tx.addOn.updateMany({
          where: {
            syncGroupId: addOn.syncGroupId,
            OR: [{ isSynced: true }, { id: addOn.id }],
          },
          data: { ...fields, isSynced: true },
        });

        return;
      }

      if (isSynced) {
        const groupSyncId = addOn.group.syncGroupId;

        if (!groupSyncId) throw new GroupNotSyncedError();

        const syncGroupId = crypto.randomUUID();

        await tx.addOn.update({
          where: { id: addOn.id },
          data: { ...fields, syncGroupId, isSynced: true },
        });

        const otherGroups = await tx.addOnGroup.findMany({
          where: {
            syncGroupId: groupSyncId,
            isSynced: true,
            id: { not: addOn.groupId },
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

        if (otherGroups.length > 0) {
          await tx.addOn.createMany({
            data: otherGroups.map((group) => ({
              ...fields,
              locationId: group.locationId,
              groupId: group.id,
              order: (group.addOns[0]?.order ?? 0) + 1,
              syncGroupId,
              isSynced: true,
            })),
          });
        }

        return;
      }

      await tx.addOn.update({
        where: { id: addOn.id },
        data: { ...fields, isSynced: false },
      });
    });

    const updated = await prisma.addOn.findFirst({
      where: { id: addOn.id, locationId },
      select: ADD_ON_SELECT,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof GroupNotSyncedError) {
      return NextResponse.json(
        {
          error:
            "This add-on's group is not synced, so the add-on can't be synced",
        },
        { status: 400 },
      );
    }

    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          error:
            "An add-on with this name already exists in this group at one or more locations",
        },
        { status: 409 },
      );
    }

    console.error("Failed to update add-on:", error);

    return NextResponse.json(
      { error: "Failed to update add-on" },
      { status: 500 },
    );
  }
}

// DELETE /api/businesses/[businessId]/locations/[locationId]/add-ons/[addOnId]
// Items using the add-on lose it (cascade). The dashboard warns first and
// suggests turning it off instead.
export async function DELETE(
  request: Request,
  { params }: AddOnParams,
): Promise<NextResponse> {
  try {
    const { businessId, locationId, addOnId } = await params;
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

    const addOn = await prisma.addOn.findFirst({
      where: { id: addOnId, locationId },
      select: { id: true, groupId: true, syncGroupId: true },
    });

    if (!addOn) {
      return NextResponse.json(
        { error: "This add-on does not exist in our records" },
        { status: 404 },
      );
    }

    const addOnsToDelete =
      addOn.syncGroupId && deleteAllSynced
        ? await prisma.addOn.findMany({
            where: {
              syncGroupId: addOn.syncGroupId,
              OR: [{ isSynced: true }, { id: addOn.id }],
            },
            select: { id: true, groupId: true },
          })
        : [addOn];

    await prisma.$transaction(async (tx) => {
      await tx.addOn.deleteMany({
        where: { id: { in: addOnsToDelete.map((deleted) => deleted.id) } },
      });

      const groupIds = new Set(addOnsToDelete.map((deleted) => deleted.groupId));

      for (const groupId of groupIds) {
        await renumberAddOns(tx, groupId);
      }
    });

    return NextResponse.json(
      {
        message:
          addOnsToDelete.length > 1
            ? "Synchronized add-ons deleted successfully"
            : "Add-on deleted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete add-on:", error);

    return NextResponse.json(
      { error: "Failed to delete add-on" },
      { status: 500 },
    );
  }
}
