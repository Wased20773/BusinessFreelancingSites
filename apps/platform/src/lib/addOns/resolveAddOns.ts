import type { Prisma } from "@business-freelancer/database";

/*
 *   Turns an item's add-on links into what the client website reads: the
 *   groups with the add-ons this item (or option) uses, each with its final
 *   price. The website never needs to know about the two link tables or
 *   the "vary by option" setting. See docs/add-ons-plan.md.
 **/

// The Prisma select for an item's or option's add-on links.
export const ADD_ON_LINKS_QUERY = {
  orderBy: { order: "asc" },
  select: {
    addOnId: true,
    price: true,
    order: true,
    addOn: {
      select: {
        id: true,
        name: true,
        description: true,
        calories: true,
        price: true,
        order: true,
        isAvailable: true,
        group: { select: { id: true, name: true, order: true } },
      },
    },
  },
} as const;

type Decimal = Prisma.Decimal;

export type AddOnLinkRow = {
  addOnId: string;
  price: Decimal | null;
  order: number;
  addOn: {
    id: string;
    name: string;
    description: string | null;
    calories: number | null;
    price: Decimal;
    order: number;
    isAvailable: boolean;
    group: { id: string; name: string; order: number };
  };
};

export type ResolvedAddOn = {
  id: string;
  name: string;
  description: string | null;
  calories: number | null;
  price: Decimal;
  order: number;
};

export type ResolvedAddOnGroup = {
  id: string;
  name: string;
  order: number;
  addOns: ResolvedAddOn[];
};

/*
 *   Groups the links by add-on group. Unavailable add-ons are left out,
 *   so a group only appears when it has an add-on to show. Groups and
 *   add-ons follow their order on the Add-ons page.
 **/
export function resolveAddOnGroups(links: AddOnLinkRow[]): ResolvedAddOnGroup[] {
  const groups = new Map<string, ResolvedAddOnGroup>();

  for (const link of links) {
    const { addOn } = link;

    if (!addOn.isAvailable) continue;

    let group = groups.get(addOn.group.id);

    if (!group) {
      group = {
        id: addOn.group.id,
        name: addOn.group.name,
        order: addOn.group.order,
        addOns: [],
      };
      groups.set(addOn.group.id, group);
    }

    group.addOns.push({
      id: addOn.id,
      name: addOn.name,
      description: addOn.description,
      calories: addOn.calories,
      // The item's own price, or the add-on's default.
      price: link.price ?? addOn.price,
      order: addOn.order,
    });
  }

  return [...groups.values()]
    .sort((a, b) => a.order - b.order)
    .map((group) => ({
      ...group,
      addOns: group.addOns.sort((a, b) => a.order - b.order),
    }));
}

// The saved links as the dashboard's item form reads them.
export type AddOnLinkJson = { addOnId: string; price: Decimal | null };

type ItemWithLinks = {
  addOnsVaryByOption: boolean;
  addOns: AddOnLinkRow[];
  options: ({ addOns: AddOnLinkRow[] } & Record<string, unknown>)[];
} & Record<string, unknown>;

function savedLinks(links: AddOnLinkRow[]): AddOnLinkJson[] {
  return links.map((link) => ({ addOnId: link.addOnId, price: link.price }));
}

/*
 *   Replaces an item's raw links with `addOnGroups` on the item (when the
 *   setting is off) or on each option (when it's on). The other side gets
 *   an empty list, so the shape is always the same.
 *
 *   keepSavedLinks (dashboard only): also returns addOnsVaryByOption and
 *   both saved link sets, including unused and unavailable ones, so the
 *   item form can show and keep them.
 **/
export function resolveItemAddOns<T extends ItemWithLinks>(
  item: T,
  { keepSavedLinks = false }: { keepSavedLinks?: boolean } = {},
) {
  const { addOnsVaryByOption, addOns, options, ...rest } = item;

  return {
    ...rest,
    ...(keepSavedLinks
      ? { addOnsVaryByOption, addOns: savedLinks(addOns) }
      : {}),
    addOnGroups: addOnsVaryByOption ? [] : resolveAddOnGroups(addOns),
    options: options.map((option) => {
      const { addOns: optionAddOns, ...optionRest } = option;

      return {
        ...optionRest,
        ...(keepSavedLinks ? { addOns: savedLinks(optionAddOns) } : {}),
        addOnGroups: addOnsVaryByOption
          ? resolveAddOnGroups(optionAddOns)
          : [],
      };
    }),
  };
}

type MenuCategory = {
  items?: unknown[];
  subcategories?: MenuCategory[];
} & Record<string, unknown>;

// Resolves the add-ons of every item in a menu response.
export function resolveMenuAddOns(location: Record<string, unknown>) {
  const resolveCategory = (category: MenuCategory): MenuCategory => ({
    ...category,
    ...(category.items
      ? {
          // Items selected without their add-on links are left as they are.
          items: category.items.map((item) =>
            item && typeof item === "object" && "addOns" in item
              ? resolveItemAddOns(item as ItemWithLinks)
              : item,
          ),
        }
      : {}),
    ...(category.subcategories
      ? { subcategories: category.subcategories.map(resolveCategory) }
      : {}),
  });

  const categories = location.categories as MenuCategory[] | undefined;

  return {
    ...location,
    ...(categories ? { categories: categories.map(resolveCategory) } : {}),
  };
}
