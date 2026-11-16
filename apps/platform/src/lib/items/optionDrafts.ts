import type { AddOnLinkJson, ItemOptionsJson } from "@/types/types";

/*
 *   One picked add-on in the item form. price is as typed: empty means the
 *   item uses the add-on's default price.
 **/
export type AddOnLinkDraft = {
  addOnId: string;
  price: string;
};

export type AddOnLinkPayload = {
  addOnId: string;
  price: number | null;
};

export function draftsFromLinks(links: AddOnLinkJson[] = []): AddOnLinkDraft[] {
  return links.map((link) => ({
    addOnId: link.addOnId,
    price: link.price === null ? "" : String(Number(link.price)),
  }));
}

/*
 *   The add-on links for a request, or an error message. `where` names the
 *   item or option in the message.
 **/
export function linksToPayload(
  drafts: AddOnLinkDraft[],
  where: string,
): { links: AddOnLinkPayload[] } | { error: string } {
  const links: AddOnLinkPayload[] = [];

  for (const draft of drafts) {
    const price = draft.price.trim();

    if (price === "") {
      links.push({ addOnId: draft.addOnId, price: null });
      continue;
    }

    const priceNumber = Number(price);

    if (!Number.isFinite(priceNumber) || priceNumber < 0) {
      return { error: `${where}: add-on prices must be 0 or more.` };
    }

    links.push({ addOnId: draft.addOnId, price: priceNumber });
  }

  return { links };
}

/*
 *   Options being edited on the create/edit item pages. Nothing is saved
 *   until the item is saved; then the whole list goes in one request.
 **/
export type OptionDraft = {
  key: string; // stable React key; new drafts have no id yet
  id?: string; // set for options that already exist
  name: string;
  price: string; // as typed, so an empty field stays empty
  isAvailable: boolean;
  // Used when the item's add-ons vary by option. Kept even when they don't.
  addOns: AddOnLinkDraft[];
};

export type OptionPayload = {
  id?: string;
  name: string;
  price: number;
  isAvailable: boolean;
  addOns: AddOnLinkPayload[];
};

export function newOptionDraft(): OptionDraft {
  return {
    key: crypto.randomUUID(),
    name: "",
    price: "",
    isAvailable: true,
    addOns: [],
  };
}

export function draftsFromOptions(options: ItemOptionsJson[]): OptionDraft[] {
  return options.map((option) => ({
    key: option.id,
    id: option.id,
    name: option.name,
    price: String(Number(option.price)),
    isAvailable: option.isAvailable,
    addOns: draftsFromLinks(option.addOns),
  }));
}

/*
 *   The request payload, or an error message to show. Blank rows (no name
 *   and no price) are skipped, so an unused "Add option" row isn't an error.
 **/
export function draftsToPayload(
  drafts: OptionDraft[],
): { options: OptionPayload[] } | { error: string } {
  const options: OptionPayload[] = [];
  const names = new Set<string>();

  for (const draft of drafts) {
    const name = draft.name.trim();
    const price = draft.price.trim();

    if (!name && !price && !draft.id && draft.addOns.length === 0) continue;

    if (!name) return { error: "Every option needs a name." };

    const priceNumber = Number(price);

    if (!price || !Number.isFinite(priceNumber) || priceNumber < 0) {
      return { error: `"${name}" needs a price of 0 or more.` };
    }

    if (names.has(name.toLowerCase())) {
      return { error: `Two options are named "${name}".` };
    }

    names.add(name.toLowerCase());

    // Both add-on sets stay saved, so each option's list is always sent.
    const addOns = linksToPayload(draft.addOns, `"${name}"`);

    if ("error" in addOns) return addOns;

    options.push({
      ...(draft.id ? { id: draft.id } : {}),
      name,
      price: priceNumber,
      isAvailable: draft.isAvailable,
      addOns: addOns.links,
    });
  }

  return { options };
}
