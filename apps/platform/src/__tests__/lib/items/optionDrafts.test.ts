import {
  draftsFromOptions,
  draftsToPayload,
  type OptionDraft,
} from "@/lib/items/optionDrafts";
import type { ItemOptionsJson } from "@/types/types";

function draft(overrides: Partial<OptionDraft>): OptionDraft {
  return {
    key: crypto.randomUUID(),
    name: "",
    price: "",
    isAvailable: true,
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
        { id: "option-1", name: "Small", price: 0, isAvailable: true },
        { name: "Bacon", price: 1.5, isAvailable: false },
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
    // An existing option emptied out is an error, not a silent delete.
    [[draft({ id: "option-1" })], "Every option needs a name."],
  ])("returns an error for %p", (drafts, error) => {
    expect(draftsToPayload(drafts)).toEqual({ error });
  });
});

describe("draftsFromOptions", () => {
  it("turns saved options into editable drafts", () => {
    const options = [
      { id: "option-1", name: "Small", price: "2.50", isAvailable: false },
    ] as unknown as ItemOptionsJson[];

    expect(draftsFromOptions(options)).toEqual([
      {
        key: "option-1",
        id: "option-1",
        name: "Small",
        price: "2.5",
        isAvailable: false,
      },
    ]);
  });
});
