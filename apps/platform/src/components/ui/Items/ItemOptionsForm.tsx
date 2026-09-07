import "@/app/dashboard/(protected)/page.css";
import type { ReorderDirection } from "@/lib/api/reorder";
import type { ItemOptionsJson } from "@/types/types";
import type { Dispatch, SetStateAction, SubmitEvent } from "react";
import CreateOptionForm from "../item-options/CreateOptionForm";
import ExistingOptionsForm from "../item-options/ExistingOptionsForm";

type ItemOptionsFormProps = {
  canManage: boolean;
  options: ItemOptionsJson[];
  processingOptionId: string | null;
  isCreatingOption: boolean;
  createOptionIsSynced: boolean;
  hasSyncGroup: boolean;
  isDeletingOption: boolean;
  handleCreateOption(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  handleUpdateOption(
    event: SubmitEvent<HTMLFormElement>,
    optionId: string,
  ): Promise<void>;
  setCreateOptionIsSynced: Dispatch<SetStateAction<boolean>>;
  handleMoveOption(
    optionId: string,
    direction: ReorderDirection,
  ): Promise<void>;
  handleDeleteOption(
    event: React.MouseEvent<HTMLButtonElement>,
    optionId: string,
  ): Promise<void>;
};

export default function ItemOptionsForm({
  canManage,
  handleCreateOption,
  isCreatingOption,
  options,
  processingOptionId,
  createOptionIsSynced,
  setCreateOptionIsSynced,
  hasSyncGroup,
  handleUpdateOption,
  handleMoveOption,
  handleDeleteOption,
  isDeletingOption,
}: ItemOptionsFormProps) {
  if (!canManage) {
    return (
      <section
        className="dashboard-card mt-[1.5rem] p-4"
        aria-labelledby="item-options-heading"
      >
        <h2 id="item-options-heading">Item Options</h2>

        <p>
          Options can be add-ons or variations of an item, each with its own
          price. For example, added toppings or different sizes.
        </p>

        <p>
          If the item has a price, option prices are added to it. If the item is
          $0.00, the option price is used instead.
        </p>

        {options.length === 0 ? (
          <p className="pt-4">This item has no options</p>
        ) : (
          <div className="divide-y divide-gray-300">
            {options.map((option) => (
              <div key={option.id} className="py-4">
                <div className="flex justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{option.name}</p>

                    <p className="text-sm text-gray-500 mt-1">
                      Order: {option.order}
                    </p>
                  </div>

                  <p className="font-medium whitespace-nowrap">
                    ${Number(option.price).toFixed(2)}
                  </p>
                </div>

                <p className="text-sm text-gray-500 mt-2">
                  {option.isAvailable ? "Available" : "Unavailable"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }
  return (
    <section
      className="dashboard-card mt-[1.5rem] p-4"
      aria-labelledby="item-options-heading"
    >
      <h2 id="item-options-heading">Item Options</h2>

      <p>
        Options can be add-ons or variations of an item, each with its own
        price. For example, added toppings or different sizes.
      </p>

      <p>
        If the item has a price, option prices are added to it. If the item is
        $0.00, the option price is used instead.
      </p>

      {/* CREATE OPTION */}
      <CreateOptionForm
        handleCreateOption={handleCreateOption}
        isCreatingOption={isCreatingOption}
        isSynced={createOptionIsSynced}
        setIsSynced={setCreateOptionIsSynced}
        hasSyncGroup={hasSyncGroup}
      />

      {/* EXISTING OPTIONS */}
      <ExistingOptionsForm
        options={options}
        processingOptionId={processingOptionId}
        handleUpdateOption={handleUpdateOption}
        handleMoveOption={handleMoveOption}
        handleDeleteOption={handleDeleteOption}
        isDeletingOption={isDeletingOption}
      />
    </section>
  );
}
