import { fireEvent, render, screen } from "@testing-library/react";
import AddOnPicker from "@/components/ui/items/AddOnPicker";
import ItemAddOnsSection from "@/components/ui/items/ItemAddOnsSection";
import type { AddOnLinkDraft, OptionDraft } from "@/lib/items/optionDrafts";
import type { AddOnGroupJson } from "@/types/types";

/*
 * The item form's add-on picker and Add-ons section.
 * See docs/add-ons-plan.md.
 */

function addOn(id: string, price: string, isAvailable = true) {
  return { id, name: id, price, isAvailable, usedByItems: 0 };
}

const groups = [
  {
    id: "sauces",
    name: "Sauces",
    addOns: [addOn("Ranch", "0.5"), addOn("Buffalo", "0.75"), addOn("Garlic", "0.5", false)],
  },
  { id: "empty", name: "Sold out group", addOns: [addOn("Old", "1", false)] },
] as unknown as AddOnGroupJson[];

function renderPicker(value: AddOnLinkDraft[], canManage = true) {
  const onChange = jest.fn();

  render(
    <AddOnPicker
      idPrefix="item"
      groups={groups}
      value={value}
      onChange={onChange}
      canManage={canManage}
      disabled={false}
    />,
  );

  return onChange;
}

describe("AddOnPicker", () => {
  it("hides sold-out add-ons, and groups with nothing left", () => {
    renderPicker([]);
    fireEvent.click(screen.getByRole("button", { name: /sauces/i }));

    expect(screen.getByLabelText("Ranch")).toBeInTheDocument();
    expect(screen.queryByLabelText("Garlic")).not.toBeInTheDocument();
    expect(screen.queryByText("Sold out group")).not.toBeInTheDocument();
  });

  it("keeps a sold-out add-on that was picked when another is picked", () => {
    const onChange = renderPicker([{ addOnId: "Garlic", price: "" }]);

    fireEvent.click(screen.getByRole("button", { name: /sauces/i }));
    fireEvent.click(screen.getByLabelText("Ranch"));

    expect(onChange).toHaveBeenCalledWith([
      { addOnId: "Garlic", price: "" },
      { addOnId: "Ranch", price: "" },
    ]);
  });

  it("shows the default price as a hint in a picked add-on's price box", () => {
    renderPicker([{ addOnId: "Buffalo", price: "" }]);

    // Groups start closed; the header shows how many are picked.
    const toggle = screen.getByRole("button", { name: /sauces/i });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveTextContent("1/2");
    fireEvent.click(toggle);

    const priceBox = screen.getByLabelText("+$");

    expect(priceBox).toHaveValue(null);
    expect(priceBox).toHaveAttribute("placeholder", "0.75");
  });

  it("selects every available add-on in a group", () => {
    const onChange = renderPicker([{ addOnId: "Ranch", price: "1" }]);

    fireEvent.click(screen.getByRole("button", { name: "Select all" }));

    expect(onChange).toHaveBeenCalledWith([
      { addOnId: "Ranch", price: "1" },
      { addOnId: "Buffalo", price: "" },
    ]);
  });

  it("clears every shown pick, keeping sold-out ones", () => {
    const onChange = renderPicker([
      { addOnId: "Ranch", price: "1" },
      { addOnId: "Garlic", price: "" },
    ]);

    expect(screen.getByText("1 picked")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));

    expect(onChange).toHaveBeenCalledWith([{ addOnId: "Garlic", price: "" }]);
  });

  it("has nothing to clear when nothing shown is picked", () => {
    renderPicker([{ addOnId: "Garlic", price: "" }]);

    expect(screen.getByRole("button", { name: "Clear all" })).toBeDisabled();
  });

  it("shows only what's picked, with this item's price, to staff", () => {
    renderPicker([{ addOnId: "Buffalo", price: "1" }], false);

    expect(screen.getByText("Buffalo")).toBeInTheDocument();
    expect(screen.getByText("+$1.00")).toBeInTheDocument();
    expect(screen.queryByText("Ranch")).not.toBeInTheDocument();
  });
});

function renderSection({
  varyByOption = false,
  optionDrafts = [] as OptionDraft[],
}) {
  render(
    <ItemAddOnsSection
      groups={groups}
      groupsError={null}
      addOnsHref="/add-ons"
      varyByOption={varyByOption}
      setVaryByOption={jest.fn()}
      itemAddOns={[]}
      setItemAddOns={jest.fn()}
      optionDrafts={optionDrafts}
      canManage
      disabled={false}
    />,
  );
}

const option = (addOns: AddOnLinkDraft[]): OptionDraft => ({
  key: "large",
  name: "Large",
  price: "14",
  isAvailable: true,
  addOns,
});

describe("ItemAddOnsSection", () => {
  it("needs an option before add-ons can vary by option", () => {
    renderSection({});

    expect(screen.getByLabelText(/vary by option/i)).toBeDisabled();
    expect(screen.getByText(/add an option first/i)).toBeInTheDocument();
  });

  it("notes that saved per-option add-on prices are kept while it's off", () => {
    renderSection({ optionDrafts: [option([{ addOnId: "Ranch", price: "2" }])] });

    expect(
      screen.getByText(/add-on prices for each option are still saved/i),
    ).toBeInTheDocument();
  });

  it("points to the options when add-ons vary by option", () => {
    renderSection({ varyByOption: true, optionDrafts: [option([])] });

    expect(screen.getByText(/inside its card in options/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Select all" })).not.toBeInTheDocument();
  });

  it("links to the Add-ons page when there are none", () => {
    render(
      <ItemAddOnsSection
        groups={[]}
        groupsError={null}
        addOnsHref="/add-ons"
        varyByOption={false}
        setVaryByOption={jest.fn()}
        itemAddOns={[]}
        setItemAddOns={jest.fn()}
        optionDrafts={[]}
        canManage
        disabled={false}
      />,
    );

    expect(screen.getByRole("link", { name: "Create add-ons" })).toHaveAttribute(
      "href",
      "/add-ons",
    );
  });
});
