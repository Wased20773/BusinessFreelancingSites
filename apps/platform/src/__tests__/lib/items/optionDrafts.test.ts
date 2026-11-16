import {
  draftsFromLinks,
  draftsFromOptions,
  draftsToPayload,
  linksToPayload,
  type OptionDraft,
} from "@/lib/items/optionDrafts";
import type { ItemOptionsJson } from "@/types/types";

function draft(overrides: Partial<OptionDraft>): OptionDraft {
  return {
    key: crypto.randomUUID(),
    name: "",
    price: "",
    isAvailable: true,
    addOns: [],
    ...overrides,
  };
}

describe("draftsToPayload", () => {
  it("sends existing options with their id and new ones without, in order", () => {
    expect(
      draftsToPayload([
        draft({ id: "option-1", name: " Small ", price: "0" }),
        draft({ name: "Bacon", price: "1.5", isAvailable: false }),
      ]),
    ).toEqual({
      options: [
        { id: "option-1", name: "Small", price: 0, isAvailable: true, addOns: [] },
        { name: "Bacon", price: 1.5, isAvailable: false, addOns: [] },
      ],
    });
  });

  it("always sends each option's add-ons, a blank price meaning the default", () => {
    expect(
      draftsToPayload([
        draft({
          name: "Large",
          price: "14",
          addOns: [
            { addOnId: "pepperoni", price: "2" },
            { addOnId: "olives", price: " " },
          ],
        }),
      ]),
    ).toEqual({
      options: [
        {
          name: "Large",
          price: 14,
          isAvailable: true,
          addOns: [
            { addOnId: "pepperoni", price: 2 },
            { addOnId: "olives", price: null },
          ],
        },
      ],
    });
  });

  it("skips a new row left completely empty", () => {
    expect(draftsToPayload([draft({})])).toEqual({ options: [] });
  });

  it.each([
    [[draft({ price: "1" })], "Every option needs a name."],
    [[draft({ name: "Bacon" })], '"Bacon" needs a price of 0 or more.'],
    [[draft({ name: "Bacon", price: "-2" })], '"Bacon" needs a price of 0 or more.'],
    [
      [draft({ name: "Bacon", price: "1" }), draft({ name: "BACON", price: "2" })],
      'Two options are named "BACON".',
    ],
    [
      [draft({ name: "Large", price: "1", addOns: [{ addOnId: "a", price: "-1" }] })],
      '"Large": add-on prices must be 0 or more.',
    ],
    // An existing option emptied out is an error, not a silent delete.
    [[draft({ id: "option-1" })], "Every option needs a name."],
  ])("returns an error for %p", (drafts, error) => {
    expect(draftsToPayload(drafts)).toEqual({ error });
  });
});

describe("draftsFromOptions", () => {
  it("turns saved options into editable drafts", () => {
    const options = [
      {
        id: "option-1",
        name: "Small",
        price: "2.50",
        isAvailable: false,
        addOns: [{ addOnId: "bacon", price: "1.50" }],
      },
    ] as unknown as ItemOptionsJson[];

    expect(draftsFromOptions(options)).toEqual([
      {
        key: "option-1",
        id: "option-1",
        name: "Small",
        price: "2.5",
        isAvailable: false,
        addOns: [{ addOnId: "bacon", price: "1.5" }],
      },
    ]);
  });
});

describe("add-on links", () => {
  it("shows a saved default price as an empty box", () => {
    expect(
      draftsFromLinks([
        { addOnId: "ranch", price: null },
        { addOnId: "buffalo", price: "1.00" },
      ]),
    ).toEqual([
      { addOnId: "ranch", price: "" },
      { addOnId: "buffalo", price: "1" },
    ]);
  });

  it("names where a bad price is", () => {
    expect(
      linksToPayload([{ addOnId: "ranch", price: "abc" }], "Add-ons"),
    ).toEqual({ error: "Add-ons: add-on prices must be 0 or more." });
  });
});
