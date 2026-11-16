import { fireEvent, render, screen } from "@testing-library/react";
import AddOnGroupCard, {
  ADD_ONS_PER_PAGE,
} from "@/components/ui/addOns/AddOnGroupCard";
import type { AddOnGroupJson } from "@/types/types";

/*
 * One group on the Add-ons page: what it shows, and the delete warnings
 * agreed in docs/add-ons-plan.md.
 */

const group = {
  id: "sauces",
  name: "Sauces",
  syncGroupId: "sync-1",
  isSynced: true,
  addOns: [
    {
      id: "ranch",
      name: "Ranch",
      description: "Cool and creamy",
      calories: 110,
      price: "0.5",
      isAvailable: true,
      isSynced: true,
      usedByItems: 2,
    },
    {
      id: "garlic",
      name: "Garlic",
      description: null,
      calories: null,
      price: "0.5",
      isAvailable: false,
      isSynced: false,
      usedByItems: 0,
    },
  ],
} as unknown as AddOnGroupJson;

function renderCard(canManage = true) {
  render(
    <AddOnGroupCard
      businessId="business-1"
      locationId="location-1"
      group={group}
      canManage={canManage}
      isFirst
      isLast
      isMoving={false}
      onMove={jest.fn()}
      onChanged={jest.fn()}
    />,
  );
}

// Opens the group's ⋮ menu and picks an action.
function pickAction(name: string) {
  fireEvent.keyDown(screen.getByRole("button", { name: "Sauces actions" }), {
    key: "Enter",
  });
  fireEvent.click(screen.getByRole("menuitem", { name }));
}

describe("AddOnGroupCard", () => {
  it("lists the add-ons with their details, usage, and unavailable ones", () => {
    renderCard();

    expect(screen.getByRole("heading", { name: /^Sauces/ })).toBeInTheDocument();
    expect(screen.getByText("2 add-ons · Synced")).toBeInTheDocument();
    expect(
      screen.getByText("Cool and creamy · 110 kcal · Used by 2 items"),
    ).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });

  it("folds closed and open", () => {
    renderCard();

    const toggle = screen.getByRole("button", { name: /^Sauces.*add-ons/ });

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("warns how many items use an add-on and suggests turning it off instead", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Edit Ranch" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete add-on" }));

    const dialog = screen.getByRole("dialog");

    expect(dialog).toHaveTextContent("It's used by 2 items.");
    expect(dialog).toHaveTextContent("turn off Available instead");
    expect(dialog).toHaveTextContent("also deleted at your other locations");
  });

  it("warns that deleting the group removes its add-ons from items", () => {
    renderCard();

    pickAction("Delete group");

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "This also deletes its 2 add-ons. 1 of them is used by items, and those items will no longer include it.",
    );
  });

  it("opens the new add-on form at the top of the list, even when folded", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: /^Sauces.*add-ons/ }));
    pickAction("Create add-on");

    const form = screen.getByRole("form", { name: "New add-on" });
    const firstRow = screen.getByText("Ranch");

    expect(
      form.compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renames the group from the menu", () => {
    renderCard();

    pickAction("Edit group");

    expect(screen.getByLabelText("Group name")).toHaveValue("Sauces");
  });

  it(`shows ${ADD_ONS_PER_PAGE} add-ons per page, with buttons for the rest`, () => {
    const many = {
      ...group,
      addOns: Array.from({ length: ADD_ONS_PER_PAGE + 2 }, (_, index) => ({
        ...group.addOns[0],
        id: `add-on-${index}`,
        name: `Add-on ${index + 1}`,
      })),
    } as AddOnGroupJson;

    render(
      <AddOnGroupCard
        businessId="business-1"
        locationId="location-1"
        group={many}
        canManage
        isFirst
        isLast
        isMoving={false}
        onMove={jest.fn()}
        onChanged={jest.fn()}
      />,
    );

    expect(screen.getByText(`Add-on ${ADD_ONS_PER_PAGE}`)).toBeInTheDocument();
    expect(screen.queryByText(`Add-on ${ADD_ONS_PER_PAGE + 1}`)).not.toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    expect(screen.getByText(`Add-on ${ADD_ONS_PER_PAGE + 1}`)).toBeInTheDocument();
    expect(screen.queryByText("Add-on 1")).not.toBeInTheDocument();
  });

  it("hides the page buttons when everything fits", () => {
    renderCard();

    expect(screen.queryByRole("button", { name: "Next page" })).not.toBeInTheDocument();
  });

  it("is read-only for staff", () => {
    renderCard(false);

    expect(screen.queryByRole("button", { name: /create add-on/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Ranch" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sauces actions" }),
    ).not.toBeInTheDocument();
  });
});
