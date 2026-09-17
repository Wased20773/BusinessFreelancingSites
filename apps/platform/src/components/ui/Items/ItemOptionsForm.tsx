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
  return (
    <section
      className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      aria-labelledby="item-options-heading"
    >
      <div className="border-b border-gray-300 px-5 py-4 sm:px-6">
        <h2
          id="item-options-heading"
          className="text-lg font-semibold text-gray-900"
        >
          Item Options
        </h2>
      </div>

      <div className="p-5 sm:p-6">
        <div className="space-y-2 text-sm leading-6 text-gray-600">
          <p>
            Options can be add-ons or variations of an item, each with its own
            price. For example, added toppings or different sizes.
          </p>
          <p>
            If the item has a price, option prices are added to it. If the item
            is $0.00, the option price is used instead.
          </p>
        </div>

        {canManage ? (
          <div className="mt-5">
            <CreateOptionForm
              handleCreateOption={handleCreateOption}
              isCreatingOption={isCreatingOption}
              isSynced={createOptionIsSynced}
              setIsSynced={setCreateOptionIsSynced}
              hasSyncGroup={hasSyncGroup}
            />

            <ExistingOptionsForm
              options={options}
              processingOptionId={processingOptionId}
              handleUpdateOption={handleUpdateOption}
              handleMoveOption={handleMoveOption}
              handleDeleteOption={handleDeleteOption}
              isDeletingOption={isDeletingOption}
            />
          </div>
        ) : options.length === 0 ? (
          <p className="mt-5 text-sm text-gray-600">This item has no options</p>
        ) : (
          <div className="mt-5 divide-y divide-gray-200">
            {options.map((option) => (
              <div key={option.id} className="py-3">
                <div className="flex justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {option.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      Order: {option.order}
                    </p>
                  </div>

                  <p className="whitespace-nowrap text-sm font-medium text-gray-900">
                    ${Number(option.price).toFixed(2)}
                  </p>
                </div>

                <p className="mt-2 text-xs text-gray-600">
                  {option.isAvailable ? "Available" : "Unavailable"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
