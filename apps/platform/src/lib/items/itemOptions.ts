import type { Prisma } from "@business-freelancer/database";
import {
  parseAddOnLinks,
  type AddOnLinkInput,
} from "@/lib/addOns/addOnLinks";

/*
 *   Item options are saved together with their item, in the same
 *   transaction (create and edit pages send the full list at once).
 **/

// One option as the client sends it. No id means a new option.
export type OptionInput = {
  id?: string;
  name: string;
  price: number;
  isAvailable: boolean;
  // The option's own add-on list (used when the item's add-ons vary by
  // option). Left out, the option's saved add-ons aren't touched.
  addOns?: AddOnLinkInput[];
};

/*
 *   Checks the options array from a request body. Returns the cleaned
 *   options, or an error message for a 400.
 *
 *   allowIds: edit sends ids for existing options; create never does.
 **/
export function parseOptions(
  raw: unknown,
  { allowIds }: { allowIds: boolean },
): { options: OptionInput[] } | { error: string } {
  if (!Array.isArray(raw)) {
    return { error: "Item options must be an array" };
  }

  const options: OptionInput[] = [];
  const names = new Set<string>();
  const ids = new Set<string>();

  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) {
      return { error: "Each item option must be an object" };
    }

    const { id, name, price, isAvailable, addOns } = entry as Record<
      string,
      unknown
    >;

    if (typeof name !== "string" || !name.trim()) {
      return { error: "Every option needs a name" };
    }

    if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
      return { error: `"${name.trim()}" needs a price of 0 or more` };
    }

    // Names are unique per item (case doesn't matter to a customer).
    const nameKey = name.trim().toLowerCase();

    if (names.has(nameKey)) {
      return { error: `Two options are named "${name.trim()}"` };
    }

    names.add(nameKey);

    if (id !== undefined) {
      if (!allowIds || typeof id !== "string" || !id) {
        return { error: "Invalid option id" };
      }

      if (ids.has(id)) {
        return { error: "The same option was sent twice" };
      }

      ids.add(id);
    }

    let addOnLinks: AddOnLinkInput[] | undefined;

    if (addOns !== undefined) {
      const parsedAddOns = parseAddOnLinks(addOns);

      if ("error" in parsedAddOns) {
        return { error: `"${name.trim()}": ${parsedAddOns.error}` };
      }

      addOnLinks = parsedAddOns.links;
    }

    options.push({
      ...(typeof id === "string" ? { id } : {}),
      name: name.trim(),
      price: Math.round(price * 100) / 100,
      isAvailable: isAvailable !== false,
      ...(addOnLinks ? { addOns: addOnLinks } : {}),
    });
  }

  return { options };
}

/*
 *   Options for a brand-new item, or for each synced copy of it.
 *   A synced option shares one syncGroupId across the copies. Each row
 *   gets its id up front, so add-ons can be linked to it afterwards.
 **/
export function newOptionRows(
  itemIds: string[],
  options: OptionInput[],
  isSynced: boolean,
): (Prisma.ItemOptionCreateManyInput & { id: string })[] {
  const syncGroupIds = options.map(() =>
    isSynced ? crypto.randomUUID() : null,
  );

  return itemIds.flatMap((itemId) =>
    options.map((option, index) => ({
      id: crypto.randomUUID(),
      itemId,
      name: option.name,
      price: option.price,
      order: index + 1,
      isAvailable: option.isAvailable,
      syncGroupId: syncGroupIds[index],
      isSynced,
    })),
  );
}

type ExistingOption = { id: string; syncGroupId: string | null };

/*
 *   Makes the item's options match `options` exactly, in that order:
 *   missing ones are deleted, ones with an id are updated, ones without
 *   an id are created.
 *
 *   When syncCopies is set (the item is saved synced), changes reach the
 *   synced copies of each option on the other locations' items too, and
 *   new options are added to every synced copy of the item. Order stays
 *   per item, like everywhere else.
 *
 *   Returns this item's option ids, in the same order as `options`.
 *
 *   Run inside the item's transaction.
 **/
export async function replaceItemOptions(
  tx: Prisma.TransactionClient,
  {
    itemId,
    existing,
    options,
    syncCopies,
    copyItemIds,
  }: {
    itemId: string;
    existing: ExistingOption[];
    options: OptionInput[];
    syncCopies: boolean;
    // The other locations' synced copies of this item.
    copyItemIds: string[];
  },
): Promise<string[]> {
  const keptIds = new Set(options.flatMap((option) => option.id ?? []));
  const existingById = new Map(existing.map((option) => [option.id, option]));
  const syncWide = syncCopies && copyItemIds.length > 0;

  // 1. Delete what was removed (and its synced copies).
  for (const option of existing) {
    if (keptIds.has(option.id)) continue;

    if (syncWide && option.syncGroupId) {
      await tx.itemOption.deleteMany({
        where: {
          syncGroupId: option.syncGroupId,
          OR: [{ isSynced: true }, { id: option.id }],
        },
      });
    } else {
      await tx.itemOption.delete({ where: { id: option.id } });
    }
  }

  // 2. Update kept options and their order; reach synced copies.
  for (const [index, option] of options.entries()) {
    const current = option.id ? existingById.get(option.id) : undefined;

    if (!current) continue;

    const isSyncedOption = syncCopies && current.syncGroupId !== null;

    await tx.itemOption.update({
      where: { id: current.id },
      data: {
        name: option.name,
        price: option.price,
        isAvailable: option.isAvailable,
        order: index + 1,
        isSynced: isSyncedOption,
      },
    });

    if (syncWide && current.syncGroupId) {
      await tx.itemOption.updateMany({
        where: {
          syncGroupId: current.syncGroupId,
          isSynced: true,
          id: { not: current.id },
        },
        data: {
          name: option.name,
          price: option.price,
          isAvailable: option.isAvailable,
        },
      });
    }
  }

  /*
   * 3. Create new options at their place in this item's list. On a synced
   *    item each gets its own sync group, so copies can share it (now, or
   *    when a location joins the group later).
   */
  const newSyncGroupIds = new Map<OptionInput, string>();
  const optionIds = options.map((option) =>
    option.id && existingById.has(option.id) ? option.id : crypto.randomUUID(),
  );

  for (const [index, option] of options.entries()) {
    if (option.id && existingById.has(option.id)) continue;

    const syncGroupId = syncCopies ? crypto.randomUUID() : null;

    if (syncGroupId) newSyncGroupIds.set(option, syncGroupId);

    await tx.itemOption.create({
      data: {
        id: optionIds[index],
        itemId,
        name: option.name,
        price: option.price,
        order: index + 1,
        isAvailable: option.isAvailable,
        syncGroupId,
        isSynced: syncCopies,
      },
    });
  }

  if (!syncWide) return optionIds;

  // 4. Synced copies: renumber each copy so deletes leave no gaps, then
  //    add the new options at the end of its list.
  const newSyncedOptions = [...newSyncGroupIds];

  for (const copyItemId of copyItemIds) {
    const copyOptions = await tx.itemOption.findMany({
      where: { itemId: copyItemId },
      orderBy: { order: "asc" },
      select: { id: true },
    });

    for (const [index, copyOption] of copyOptions.entries()) {
      await tx.itemOption.update({
        where: { id: copyOption.id },
        data: { order: index + 1 },
      });
    }

    if (newSyncedOptions.length > 0) {
      await tx.itemOption.createMany({
        data: newSyncedOptions.map(([option, syncGroupId], index) => ({
          itemId: copyItemId,
          name: option.name,
          price: option.price,
          order: copyOptions.length + index + 1,
          isAvailable: option.isAvailable,
          syncGroupId,
          isSynced: true,
        })),
      });
    }
  }

  return optionIds;
}
