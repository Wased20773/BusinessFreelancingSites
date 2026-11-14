import type { ItemOptionsJson } from "@/types/types";

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
};

export type OptionPayload = {
  id?: string;
  name: string;
  price: number;
  isAvailable: boolean;
};

export function newOptionDraft(): OptionDraft {
  return {
    key: crypto.randomUUID(),
    name: "",
    price: "",
    isAvailable: true,
  };
}

export function draftsFromOptions(options: ItemOptionsJson[]): OptionDraft[] {
  return options.map((option) => ({
    key: option.id,
    id: option.id,
    name: option.name,
    price: String(Number(option.price)),
    isAvailable: option.isAvailable,
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

    if (!name && !price && !draft.id) continue;

    if (!name) return { error: "Every option needs a name." };

    const priceNumber = Number(price);

    if (!price || !Number.isFinite(priceNumber) || priceNumber < 0) {
      return { error: `"${name}" needs a price of 0 or more.` };
    }

    if (names.has(name.toLowerCase())) {
      return { error: `Two options are named "${name}".` };
    }

    names.add(name.toLowerCase());

    options.push({
      ...(draft.id ? { id: draft.id } : {}),
      name,
      price: priceNumber,
      isAvailable: draft.isAvailable,
    });
  }

  return { options };
}
