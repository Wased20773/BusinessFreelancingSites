import type { Prisma } from "@business-freelancer/database";

/*
 *   Links between items (or options) and add-ons. They are sent with the
 *   item and saved in the item's transaction, like its options.
 *   See docs/add-ons-plan.md.
 **/

// One picked add-on as the client sends it. A null price means the item
// uses the add-on's default price.
export type AddOnLinkInput = {
  addOnId: string;
  price: number | null;
};

/*
 *   Checks an add-on list from a request body. Returns the cleaned links,
 *   or an error message for a 400.
 **/
export function parseAddOnLinks(
  raw: unknown,
): { links: AddOnLinkInput[] } | { error: string } {
  if (!Array.isArray(raw)) {
    return { error: "Add-ons must be an array" };
  }

  const links: AddOnLinkInput[] = [];
  const ids = new Set<string>();

  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) {
      return { error: "Each add-on must be an object" };
    }

    const { addOnId, price } = entry as Record<string, unknown>;

    if (typeof addOnId !== "string" || !addOnId) {
      return { error: "Invalid add-on id" };
    }

    if (ids.has(addOnId)) {
      return { error: "The same add-on was picked twice" };
    }

    ids.add(addOnId);

    const hasPrice = price !== null && price !== undefined;

    if (
      hasPrice &&
      (typeof price !== "number" || !Number.isFinite(price) || price < 0)
    ) {
      return { error: "Add-on prices must be 0 or more" };
    }

    links.push({
      addOnId,
      price: hasPrice ? Math.round((price as number) * 100) / 100 : null,
    });
  }

  return { links };
}

/*
 *   The item's add-on fields from a create or edit body. Each is optional:
 *   left out, it isn't changed (or uses the default on create).
 **/
export function readItemAddOnFields(body: Record<string, unknown>):
  | { addOnsVaryByOption?: boolean; addOns?: AddOnLinkInput[] }
  | { error: string } {
  const { addOnsVaryByOption, addOns } = body;

  if (
    addOnsVaryByOption !== undefined &&
    typeof addOnsVaryByOption !== "boolean"
  ) {
    return { error: "The add-ons vary by option setting must be true or false" };
  }

  if (addOns === undefined) {
    return { addOnsVaryByOption };
  }

  const parsed = parseAddOnLinks(addOns);

  if ("error" in parsed) return parsed;

  return { addOnsVaryByOption, addOns: parsed.links };
}

// Every add-on id an item save refers to, on the item and its options.
export function addOnIdsInSave(
  addOns: AddOnLinkInput[] | undefined,
  options: { addOns?: AddOnLinkInput[] }[],
): string[] {
  return [
    ...(addOns ?? []),
    ...options.flatMap((option) => option.addOns ?? []),
  ].map((link) => link.addOnId);
}

/*
 *   True when any of the ids isn't an add-on at this location (a typo, or
 *   another location's add-on).
 **/
export async function hasAddOnsOutsideLocation(
  db: Prisma.TransactionClient,
  locationId: string,
  addOnIds: string[],
): Promise<boolean> {
  const uniqueIds = [...new Set(addOnIds)];

  if (uniqueIds.length === 0) return false;

  const found = await db.addOn.count({
    where: { id: { in: uniqueIds }, locationId },
  });

  return found !== uniqueIds.length;
}

// Makes the item's own add-on list match `links`, in that order.
export async function replaceItemAddOns(
  tx: Prisma.TransactionClient,
  itemId: string,
  links: AddOnLinkInput[],
) {
  await tx.itemAddOn.deleteMany({ where: { itemId } });

  if (links.length > 0) {
    await tx.itemAddOn.createMany({
      data: links.map((link, index) => ({
        itemId,
        addOnId: link.addOnId,
        price: link.price,
        order: index + 1,
      })),
    });
  }
}

// Makes one option's add-on list match `links`, in that order.
export async function replaceOptionAddOns(
  tx: Prisma.TransactionClient,
  optionId: string,
  links: AddOnLinkInput[],
) {
  await tx.itemOptionAddOn.deleteMany({ where: { optionId } });

  if (links.length > 0) {
    await tx.itemOptionAddOn.createMany({
      data: links.map((link, index) => ({
        optionId,
        addOnId: link.addOnId,
        price: link.price,
        order: index + 1,
      })),
    });
  }
}

type SourceLink = {
  price: Prisma.Decimal | null;
  addOn: { syncGroupId: string | null; isSynced: boolean };
};

const SOURCE_LINK_SELECT = {
  orderBy: { order: "asc" },
  select: {
    price: true,
    addOn: { select: { syncGroupId: true, isSynced: true } },
  },
} as const;

function syncedLinks(links: SourceLink[]) {
  return links.filter((link) => link.addOn.isSynced && link.addOn.syncGroupId);
}

/*
 *   After a synced save, gives each synced copy of the item the same links
 *   to synced add-ons as the item that was saved, for the item itself and
 *   for each synced option. Each link points at that location's copy of the
 *   add-on (same syncGroupId); when a location has no copy, it's skipped.
 *
 *   A copy's links to its location's own (unsynced) add-ons are kept, after
 *   the synced ones.
 *
 *   Run inside the item's transaction, after the item's own links are saved.
 **/
export async function copyAddOnLinksToCopies(
  tx: Prisma.TransactionClient,
  {
    sourceItemId,
    copyItemIds,
  }: {
    sourceItemId: string;
    copyItemIds: string[];
  },
) {
  if (copyItemIds.length === 0) return;

  const source = await tx.item.findUnique({
    where: { id: sourceItemId },
    select: {
      addOns: SOURCE_LINK_SELECT,
      options: {
        select: { syncGroupId: true, addOns: SOURCE_LINK_SELECT },
      },
    },
  });

  if (!source) return;

  const itemLinks = syncedLinks(source.addOns);
  const optionLinks = source.options.flatMap((option) =>
    option.syncGroupId
      ? [{ syncGroupId: option.syncGroupId, links: syncedLinks(option.addOns) }]
      : [],
  );

  const addOnSyncGroupIds = [
    ...new Set(
      [...itemLinks, ...optionLinks.flatMap((option) => option.links)].map(
        (link) => link.addOn.syncGroupId as string,
      ),
    ),
  ];

  const copies = await tx.item.findMany({
    where: { id: { in: copyItemIds } },
    select: {
      id: true,
      locationId: true,
      options: { select: { id: true, syncGroupId: true } },
    },
  });

  const copyAddOns =
    addOnSyncGroupIds.length > 0
      ? await tx.addOn.findMany({
          where: {
            syncGroupId: { in: addOnSyncGroupIds },
            isSynced: true,
            locationId: { in: copies.map((copy) => copy.locationId) },
          },
          select: { id: true, locationId: true, syncGroupId: true },
        })
      : [];

  const addOnIdAt = new Map(
    copyAddOns.map((addOn) => [
      `${addOn.locationId}:${addOn.syncGroupId}`,
      addOn.id,
    ]),
  );

  for (const copy of copies) {
    const mapLinks = (links: SourceLink[]) =>
      links.flatMap((link) => {
        const addOnId = addOnIdAt.get(
          `${copy.locationId}:${link.addOn.syncGroupId}`,
        );

        return addOnId ? [{ addOnId, price: link.price }] : [];
      });

    // The item's own list on this copy.
    await tx.itemAddOn.deleteMany({
      where: { itemId: copy.id, addOn: { isSynced: true } },
    });

    const mappedItemLinks = mapLinks(itemLinks);

    if (mappedItemLinks.length > 0) {
      await tx.itemAddOn.createMany({
        data: mappedItemLinks.map((link, index) => ({
          itemId: copy.id,
          addOnId: link.addOnId,
          price: link.price,
          order: index + 1,
        })),
      });
    }

    const localItemLinks = await tx.itemAddOn.findMany({
      where: { itemId: copy.id, addOn: { isSynced: false } },
      orderBy: { order: "asc" },
      select: { addOnId: true },
    });

    for (const [index, link] of localItemLinks.entries()) {
      await tx.itemAddOn.update({
        where: { itemId_addOnId: { itemId: copy.id, addOnId: link.addOnId } },
        data: { order: mappedItemLinks.length + index + 1 },
      });
    }

    // Each synced option's list on this copy.
    for (const option of optionLinks) {
      const copyOption = copy.options.find(
        (candidate) => candidate.syncGroupId === option.syncGroupId,
      );

      if (!copyOption) continue;

      await tx.itemOptionAddOn.deleteMany({
        where: { optionId: copyOption.id, addOn: { isSynced: true } },
      });

      const mappedOptionLinks = mapLinks(option.links);

      if (mappedOptionLinks.length > 0) {
        await tx.itemOptionAddOn.createMany({
          data: mappedOptionLinks.map((link, index) => ({
            optionId: copyOption.id,
            addOnId: link.addOnId,
            price: link.price,
            order: index + 1,
          })),
        });
      }

      const localOptionLinks = await tx.itemOptionAddOn.findMany({
        where: { optionId: copyOption.id, addOn: { isSynced: false } },
        orderBy: { order: "asc" },
        select: { addOnId: true },
      });

      for (const [index, link] of localOptionLinks.entries()) {
        await tx.itemOptionAddOn.update({
          where: {
            optionId_addOnId: {
              optionId: copyOption.id,
              addOnId: link.addOnId,
            },
          },
          data: { order: mappedOptionLinks.length + index + 1 },
        });
      }
    }
  }
}
