/**
 * @jest-environment node
 */

import { ADD_ON_GROUP_FIELDS, type ApiField } from "@/data/apiReference";
import {
  resolveAddOnGroups,
  resolveItemAddOns,
  resolveMenuAddOns,
  type AddOnLinkRow,
} from "@/lib/addOns/resolveAddOns";
import { Prisma } from "@business-freelancer/database";

const decimal = (value: string) => new Prisma.Decimal(value);

function link(
  addOnId: string,
  {
    price = null,
    defaultPrice = "0.5",
    order = 1,
    isAvailable = true,
    group = { id: "sauces", name: "Sauces", order: 1 },
  }: {
    price?: string | null;
    defaultPrice?: string;
    order?: number;
    isAvailable?: boolean;
    group?: { id: string; name: string; order: number };
  } = {},
): AddOnLinkRow {
  return {
    addOnId,
    price: price === null ? null : decimal(price),
    order: 1,
    addOn: {
      id: addOnId,
      name: addOnId,
      description: null,
      calories: null,
      price: decimal(defaultPrice),
      order,
      isAvailable,
      group,
    },
  };
}

const MEATS = { id: "meats", name: "Meats", order: 2 };

describe("resolveAddOnGroups", () => {
  it("uses the item's own price when set, otherwise the add-on's default", () => {
    const [group] = resolveAddOnGroups([
      link("ranch"),
      link("buffalo", { price: "1", order: 2 }),
    ]);

    expect(group.addOns.map((addOn) => [addOn.id, addOn.price.toString()])).toEqual([
      ["ranch", "0.5"],
      ["buffalo", "1"],
    ]);
  });

  it("leaves out unavailable add-ons, and groups with nothing left", () => {
    const groups = resolveAddOnGroups([
      link("ranch"),
      link("garlic", { isAvailable: false, order: 2 }),
      link("bacon", { isAvailable: false, group: MEATS }),
    ]);

    expect(groups.map((group) => group.id)).toEqual(["sauces"]);
    expect(groups[0].addOns.map((addOn) => addOn.id)).toEqual(["ranch"]);
  });

  it("orders groups and add-ons by their order on the Add-ons page", () => {
    const groups = resolveAddOnGroups([
      link("bacon", { group: MEATS }),
      link("buffalo", { order: 2 }),
      link("ranch", { order: 1 }),
    ]);

    expect(
      groups.map((group) => [group.id, group.addOns.map((addOn) => addOn.id)]),
    ).toEqual([
      ["sauces", ["ranch", "buffalo"]],
      ["meats", ["bacon"]],
    ]);
  });

  it("returns exactly the documented AddOnGroup fields", () => {
    type Shape = { [field: string]: Shape | null };
    const toShape = (fields: ApiField[]): Shape =>
      Object.fromEntries(
        fields.map((field) => [
          field.name,
          field.fields ? toShape(field.fields) : null,
        ]),
      );
    const { addOns, ...groupFields } = toShape(ADD_ON_GROUP_FIELDS);

    const [group] = resolveAddOnGroups([link("ranch")]);

    expect(Object.keys(group).sort()).toEqual(
      Object.keys({ ...groupFields, addOns }).sort(),
    );
    expect(Object.keys(group.addOns[0]).sort()).toEqual(
      Object.keys(addOns ?? {}).sort(),
    );
  });
});

describe("resolveItemAddOns", () => {
  const item = (addOnsVaryByOption: boolean) => ({
    id: "item-1",
    addOnsVaryByOption,
    addOns: [link("ranch")],
    options: [{ id: "small", addOns: [link("bacon", { group: MEATS })] }],
  });

  it("puts the item's add-ons on the item when they don't vary by option", () => {
    const resolved = resolveItemAddOns(item(false));

    expect(resolved.addOnGroups.map((group) => group.id)).toEqual(["sauces"]);
    expect(resolved.options[0].addOnGroups).toEqual([]);
    expect(resolved).not.toHaveProperty("addOns");
    expect(resolved).not.toHaveProperty("addOnsVaryByOption");
    expect(resolved.options[0]).not.toHaveProperty("addOns");
  });

  it("puts each option's add-ons on the option when they vary by option", () => {
    const resolved = resolveItemAddOns(item(true));

    expect(resolved.addOnGroups).toEqual([]);
    expect(resolved.options[0].addOnGroups.map((group) => group.id)).toEqual([
      "meats",
    ]);
  });

  it("keeps both saved link sets for the dashboard", () => {
    const resolved = resolveItemAddOns(item(false), { keepSavedLinks: true });

    expect(resolved).toMatchObject({
      addOnsVaryByOption: false,
      addOns: [{ addOnId: "ranch", price: null }],
      options: [{ addOns: [{ addOnId: "bacon", price: null }] }],
    });
  });
});

describe("resolveMenuAddOns", () => {
  it("resolves items in categories and subcategories", () => {
    const resolved = resolveMenuAddOns({
      categories: [
        {
          id: "category-1",
          items: [{ addOnsVaryByOption: false, addOns: [link("ranch")], options: [] }],
          subcategories: [
            {
              id: "subcategory-1",
              items: [
                { addOnsVaryByOption: false, addOns: [link("bacon", { group: MEATS })], options: [] },
              ],
            },
          ],
        },
      ],
    });

    expect(resolved).toMatchObject({
      categories: [
        {
          items: [{ addOnGroups: [{ id: "sauces" }] }],
          subcategories: [{ items: [{ addOnGroups: [{ id: "meats" }] }] }],
        },
      ],
    });
  });
});
