import { render, screen } from "@testing-library/react";
import { SyncAccessProvider } from "@/components/providers/SyncAccessProvider";
import IsSyncedCheckbox from "@/components/ui/IsSyncedCheckbox";

function renderCheckbox(syncEnabled?: boolean, isSynced = true) {
  const checkbox = (
    <IsSyncedCheckbox
      hasSyncGroup
      htmlFor="sync"
      inputName="isSynced"
      isSynced={isSynced}
      setIsSynced={jest.fn()}
      isSaving={false}
      description="Changes apply to every location."
    />
  );

  return render(
    syncEnabled === undefined ? (
      checkbox
    ) : (
      <SyncAccessProvider
        syncEnabled={syncEnabled}
        billingHref="/businesses/business-123/billing"
      >
        {checkbox}
      </SyncAccessProvider>
    ),
  );
}

describe("IsSyncedCheckbox", () => {
  it("works normally on a plan with sync", () => {
    renderCheckbox(true);

    const checkbox = screen.getByLabelText(/sync to all locations/i);

    expect(checkbox).toBeEnabled();
    expect(checkbox).toBeChecked();
    expect(
      screen.getByText("Changes apply to every location."),
    ).toBeInTheDocument();
  });

  it("is locked and unchecked on Free, with a link to the plans", () => {
    renderCheckbox(false);

    const checkbox = screen.getByLabelText(/sync to all locations/i);

    expect(checkbox).toBeDisabled();
    expect(checkbox).not.toBeChecked();
    expect(
      screen.getByText(/sync is available on paid plans/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See plans" })).toHaveAttribute(
      "href",
      "/businesses/business-123/billing",
    );
  });

  it("is unlocked outside the dashboard provider", () => {
    renderCheckbox(undefined);

    expect(screen.getByLabelText(/sync to all locations/i)).toBeEnabled();
  });

  it("renders nothing for a record without a sync group", () => {
    const { container } = render(
      <IsSyncedCheckbox
        hasSyncGroup={false}
        htmlFor="sync"
        inputName="isSynced"
        isSynced={false}
        setIsSynced={jest.fn()}
        isSaving={false}
        description=""
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
