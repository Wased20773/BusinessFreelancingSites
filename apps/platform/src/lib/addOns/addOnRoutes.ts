import {
  validateBusinessLocationParams,
  verifyLocationInBusiness,
} from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel, type Prisma } from "@business-freelancer/database";
import { NextResponse } from "next/server";

/*
 *   Shared pieces of the add-on group and add-on routes.
 *   See docs/add-ons-plan.md.
 **/

export const MANAGE_LEVELS = [AccessLevel.owner, AccessLevel.admin];
export const VIEW_LEVELS = [
  AccessLevel.owner,
  AccessLevel.admin,
  AccessLevel.staff,
  AccessLevel.developer,
];

export const ADD_ON_GROUP_SELECT = {
  id: true,
  locationId: true,
  name: true,
  order: true,
  syncGroupId: true,
  isSynced: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const ADD_ON_SELECT = {
  id: true,
  locationId: true,
  groupId: true,
  name: true,
  description: true,
  calories: true,
  price: true,
  order: true,
  isAvailable: true,
  syncGroupId: true,
  isSynced: true,
  createdAt: true,
  updatedAt: true,
} as const;

/*
 *   Checks the route params, the member's access level, and that the
 *   location belongs to the business. Returns the error response, or null.
 **/
export async function checkLocationAccess(
  request: Request,
  businessId: string,
  locationId: string,
  accessLevels: AccessLevel[],
): Promise<NextResponse | null> {
  const paramsError = validateBusinessLocationParams(businessId, locationId);

  if (paramsError) return paramsError;

  const authResult = await authenticateBusinessAccess(
    request,
    businessId,
    accessLevels,
  );

  if (authResult instanceof NextResponse) return authResult;

  return verifyLocationInBusiness(businessId, locationId);
}

export function readGroupName(
  body: Record<string, unknown>,
): { name: string } | { error: string } {
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) return { error: "Missing add-on group name" };

  return { name };
}

export type AddOnFields = {
  name: string;
  description: string | null;
  calories: number | null;
  price: number;
  isAvailable: boolean;
};

// The add-on's own fields from a create or edit body.
export function readAddOnFields(
  body: Record<string, unknown>,
): { fields: AddOnFields } | { error: string } {
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) return { error: "Missing add-on name" };

  const { price, calories, description, isAvailable } = body;

  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    return { error: "The add-on needs a price of 0 or more" };
  }

  if (
    calories !== null &&
    calories !== undefined &&
    (typeof calories !== "number" ||
      !Number.isInteger(calories) ||
      calories < 0)
  ) {
    return { error: "Calories must be a whole number of 0 or more" };
  }

  if (
    description !== null &&
    description !== undefined &&
    typeof description !== "string"
  ) {
    return { error: "The add-on description must be text" };
  }

  return {
    fields: {
      name,
      description:
        typeof description === "string" && description.trim()
          ? description.trim()
          : null,
      calories: typeof calories === "number" ? calories : null,
      price: Math.round(price * 100) / 100,
      isAvailable: isAvailable !== false,
    },
  };
}

// Numbers a location's groups 1, 2, 3… in their current order.
export async function renumberGroups(
  tx: Prisma.TransactionClient,
  locationId: string,
) {
  const groups = await tx.addOnGroup.findMany({
    where: { locationId },
    orderBy: { order: "asc" },
    select: { id: true },
  });

  for (const [index, group] of groups.entries()) {
    await tx.addOnGroup.update({
      where: { id: group.id },
      data: { order: index + 1 },
    });
  }
}

// Numbers a group's add-ons 1, 2, 3… in their current order.
export async function renumberAddOns(
  tx: Prisma.TransactionClient,
  groupId: string,
) {
  const addOns = await tx.addOn.findMany({
    where: { groupId },
    orderBy: { order: "asc" },
    select: { id: true },
  });

  for (const [index, addOn] of addOns.entries()) {
    await tx.addOn.update({
      where: { id: addOn.id },
      data: { order: index + 1 },
    });
  }
}

/*
 *   How many items use each add-on, counting an item once even when it
 *   uses the add-on on several options. Shown before deleting.
 **/
export function countItemsUsing(addOn: {
  itemLinks: { itemId: string }[];
  optionLinks: { option: { itemId: string } }[];
}): number {
  return new Set([
    ...addOn.itemLinks.map((link) => link.itemId),
    ...addOn.optionLinks.map((link) => link.option.itemId),
  ]).size;
}

/*
 *   Swaps a group (within its location) or an add-on (within its group)
 *   with its neighbor above or below. Order is per location, never synced.
 **/
export async function moveAddOnRecord(
  kind: "group" | "addOn",
  id: string,
  locationId: string,
  direction: "up" | "down",
): Promise<NextResponse> {
  const label = kind === "group" ? "add-on group" : "add-on";
  const isUp = direction === "up";

  const current =
    kind === "group"
      ? await prisma.addOnGroup.findFirst({
          where: { id, locationId },
          select: { id: true, order: true, locationId: true },
        })
      : await prisma.addOn.findFirst({
          where: { id, locationId },
          select: { id: true, order: true, groupId: true },
        });

  if (!current) {
    return NextResponse.json(
      { error: `This ${label} does not exist in our records` },
      { status: 404 },
    );
  }

  const neighborQuery = {
    where: {
      ...("groupId" in current ? { groupId: current.groupId } : { locationId }),
      order: isUp ? { lt: current.order } : { gt: current.order },
    },
    orderBy: { order: isUp ? ("desc" as const) : ("asc" as const) },
    select: { id: true, order: true },
  };

  const neighbor =
    kind === "group"
      ? await prisma.addOnGroup.findFirst(neighborQuery)
      : await prisma.addOn.findFirst(neighborQuery);

  if (!neighbor) {
    return NextResponse.json(
      {
        error: `This ${label} is already at the ${isUp ? "top" : "bottom"}`,
      },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    const model = kind === "group" ? tx.addOnGroup : tx.addOn;

    await (model as typeof tx.addOn).update({
      where: { id: current.id },
      data: { order: neighbor.order },
    });
    await (model as typeof tx.addOn).update({
      where: { id: neighbor.id },
      data: { order: current.order },
    });
  });

  return NextResponse.json(
    { message: `${label[0].toUpperCase()}${label.slice(1)} moved ${direction}` },
    { status: 200 },
  );
}

export const USAGE_SELECT = {
  itemLinks: { select: { itemId: true } },
  optionLinks: { select: { option: { select: { itemId: true } } } },
} as const;
