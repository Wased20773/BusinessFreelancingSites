/**
 * @jest-environment node
 */

import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
import {
  addOnIdsInSave,
  copyAddOnLinksToCopies,
  hasAddOnsOutsideLocation,
  parseAddOnLinks,
  readItemAddOnFields,
  replaceItemAddOns,
} from "@/lib/addOns/addOnLinks";
import type { Prisma } from "@business-freelancer/database";

const tx = mockPrisma as unknown as Prisma.TransactionClient;

beforeEach(() => {
  jest.resetAllMocks();
  resetPrismaMock();
});

describe("parseAddOnLinks", () => {
  it("keeps the order, rounds prices to cents, and treats a missing price as the default", () => {
    expect(
      parseAddOnLinks([
        { addOnId: "ranch" },
        { addOnId: "buffalo", price: 1.234 },
        { addOnId: "garlic", price: null },
      ]),
    ).toEqual({
      links: [
        { addOnId: "ranch", price: null },
        { addOnId: "buffalo", price: 1.23 },
        { addOnId: "garlic", price: null },
      ],
    });
  });

  it.each([
    ["not an array", "nope", "Add-ons must be an array"],
    ["a non-object entry", ["ranch"], "Each add-on must be an object"],
    ["a missing id", [{ price: 1 }], "Invalid add-on id"],
    [
      "the same add-on twice",
      [{ addOnId: "ranch" }, { addOnId: "ranch" }],
      "The same add-on was picked twice",
    ],
    ["a negative price", [{ addOnId: "ranch", price: -1 }], "Add-on prices must be 0 or more"],
    ["a text price", [{ addOnId: "ranch", price: "1" }], "Add-on prices must be 0 or more"],
  ])("rejects %s", (_case, raw, error) => {
    expect(parseAddOnLinks(raw)).toEqual({ error });
  });
});

describe("readItemAddOnFields", () => {
  it("leaves out what wasn't sent", () => {
    expect(readItemAddOnFields({})).toEqual({ addOnsVaryByOption: undefined });
  });

  it("reads the setting and the item's list", () => {
    expect(
      readItemAddOnFields({
        addOnsVaryByOption: true,
        addOns: [{ addOnId: "ranch", price: 1 }],
      }),
    ).toEqual({
      addOnsVaryByOption: true,
      addOns: [{ addOnId: "ranch", price: 1 }],
    });
  });

  it("rejects a setting that isn't true or false", () => {
    expect(readItemAddOnFields({ addOnsVaryByOption: "yes" })).toEqual({
      error: "The add-ons vary by option setting must be true or false",
    });
  });
});

describe("addOnIdsInSave", () => {
  it("collects the item's and every option's add-on ids", () => {
    expect(
      addOnIdsInSave(
        [{ addOnId: "ranch", price: null }],
        [{ addOns: [{ addOnId: "bacon", price: 2 }] }, {}],
      ),
    ).toEqual(["ranch", "bacon"]);
  });
});

describe("hasAddOnsOutsideLocation", () => {
  it("skips the query when nothing was picked", async () => {
    await expect(hasAddOnsOutsideLocation(tx, "location-1", [])).resolves.toBe(false);
    expect(mockPrisma.addOn.count).not.toHaveBeenCalled();
  });

  it("is false when every add-on is at the location (counting repeats once)", async () => {
    mockPrisma.addOn.count.mockResolvedValue(2);

    await expect(
      hasAddOnsOutsideLocation(tx, "location-1", ["ranch", "bacon", "ranch"]),
    ).resolves.toBe(false);
    expect(mockPrisma.addOn.count).toHaveBeenCalledWith({
      where: { id: { in: ["ranch", "bacon"] }, locationId: "location-1" },
    });
  });

  it("is true when one isn't", async () => {
    mockPrisma.addOn.count.mockResolvedValue(1);

    await expect(
      hasAddOnsOutsideLocation(tx, "location-1", ["ranch", "other-location"]),
    ).resolves.toBe(true);
  });
});

describe("replaceItemAddOns", () => {
  it("replaces the item's list, numbered in the sent order", async () => {
    await replaceItemAddOns(tx, "item-1", [
      { addOnId: "buffalo", price: 1 },
      { addOnId: "ranch", price: null },
    ]);

    expect(mockPrisma.itemAddOn.deleteMany).toHaveBeenCalledWith({
      where: { itemId: "item-1" },
    });
    expect(mockPrisma.itemAddOn.createMany).toHaveBeenCalledWith({
      data: [
        { itemId: "item-1", addOnId: "buffalo", price: 1, order: 1 },
        { itemId: "item-1", addOnId: "ranch", price: null, order: 2 },
      ],
    });
  });

  it("only clears the list when it's empty", async () => {
    await replaceItemAddOns(tx, "item-1", []);

    expect(mockPrisma.itemAddOn.deleteMany).toHaveBeenCalled();
    expect(mockPrisma.itemAddOn.createMany).not.toHaveBeenCalled();
  });
});

describe("copyAddOnLinksToCopies", () => {
  const synced = (syncGroupId: string) => ({ syncGroupId, isSynced: true });

  beforeEach(() => {
    // The saved item: two synced add-ons and one of its location's own.
    mockPrisma.item.findUnique.mockResolvedValue({
      addOns: [
        { price: null, addOn: synced("ranch-group") },
        { price: 1, addOn: synced("buffalo-group") },
        { price: null, addOn: { syncGroupId: null, isSynced: false } },
      ],
      options: [
        { syncGroupId: "large-group", addOns: [{ price: 2, addOn: synced("ranch-group") }] },
      ],
    });
    // Location B's copy.
    mockPrisma.item.findMany.mockResolvedValue([
      {
        id: "copy-b",
        locationId: "location-b",
        options: [{ id: "large-b", syncGroupId: "large-group" }],
      },
    ]);
    // Location B has ranch but not buffalo.
    mockPrisma.addOn.findMany.mockResolvedValue([
      { id: "ranch-b", locationId: "location-b", syncGroupId: "ranch-group" },
    ]);
    // Location B's copy also uses one of its own add-ons.
    mockPrisma.itemAddOn.findMany.mockResolvedValue([{ addOnId: "own-b" }]);
    mockPrisma.itemOptionAddOn.findMany.mockResolvedValue([]);
  });

  it("does nothing without copies", async () => {
    await copyAddOnLinksToCopies(tx, { sourceItemId: "item-a", copyItemIds: [] });

    expect(mockPrisma.item.findUnique).not.toHaveBeenCalled();
  });

  it("links each copy to its own location's add-ons, skipping ones it doesn't have", async () => {
    await copyAddOnLinksToCopies(tx, {
      sourceItemId: "item-a",
      copyItemIds: ["copy-b"],
    });

    // Only links to synced add-ons are replaced on the copy.
    expect(mockPrisma.itemAddOn.deleteMany).toHaveBeenCalledWith({
      where: { itemId: "copy-b", addOn: { isSynced: true } },
    });
    expect(mockPrisma.itemAddOn.createMany).toHaveBeenCalledWith({
      data: [{ itemId: "copy-b", addOnId: "ranch-b", price: null, order: 1 }],
    });
    // The copy's own add-on is kept, after the synced ones.
    expect(mockPrisma.itemAddOn.update).toHaveBeenCalledWith({
      where: { itemId_addOnId: { itemId: "copy-b", addOnId: "own-b" } },
      data: { order: 2 },
    });

    // The synced option's list goes to the copy's matching option.
    expect(mockPrisma.itemOptionAddOn.deleteMany).toHaveBeenCalledWith({
      where: { optionId: "large-b", addOn: { isSynced: true } },
    });
    expect(mockPrisma.itemOptionAddOn.createMany).toHaveBeenCalledWith({
      data: [{ optionId: "large-b", addOnId: "ranch-b", price: 2, order: 1 }],
    });
  });
});
