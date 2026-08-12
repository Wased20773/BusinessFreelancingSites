import { ReorderDirection } from "@/lib/api/reorder";
import { ItemOptionsJson } from "@/types/types";
import { SubmitEvent } from "react";

type ExistingOptionsFormParams = {
  options: ItemOptionsJson[];
  processingOptionId: string | null;
  handleUpdateOption(
    event: SubmitEvent<HTMLFormElement>,
    optionId: string,
  ): Promise<void>;
  handleMoveOption(
    optionId: string,
    direction: ReorderDirection,
  ): Promise<void>;
  handleDeleteOption(itemId: string): Promise<void>;
};

export default function ExistingOptionsForm({
  options,
  processingOptionId,
  handleUpdateOption,
  handleMoveOption,
  handleDeleteOption,
}: ExistingOptionsFormParams) {
  return (
    <>
      {options.length === 0 ? (
        <p className="pt-4">This item has no options</p>
      ) : (
        <div>
          {options.map((option, index) => {
            const isProcessingOption = processingOptionId === option.id;

            const isFirst = index === 0;

            const isLast = index === options.length - 1;

            return (
              <form
                key={option.id}
                className="border-b border-gray-300 py-4 last:border-b-0"
                onSubmit={(event) => handleUpdateOption(event, option.id)}
              >
                <fieldset className="grid gap-3" disabled={isProcessingOption}>
                  <div className="grid gap-3 md:grid-cols-[1fr_150px_auto]">
                    <div>
                      <label htmlFor={`option-name-${option.id}`}>Name</label>

                      <input
                        className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                        id={`option-name-${option.id}`}
                        name="name"
                        type="text"
                        defaultValue={option.name}
                      />
                    </div>

                    <div>
                      <label htmlFor={`option-price-${option.id}`}>Price</label>

                      <input
                        className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                        id={`option-price-${option.id}`}
                        name="price"
                        type="number"
                        min="0"
                        step="0.10"
                        defaultValue={option.price}
                      />
                    </div>

                    <label
                      className="flex items-end gap-2 pb-2 cursor-pointer"
                      htmlFor={`option-available-${option.id}`}
                    >
                      <input
                        id={`option-available-${option.id}`}
                        name="isAvailable"
                        type="checkbox"
                        defaultChecked={option.isAvailable}
                      />
                      Available?
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="border-[0.1rem] border-gray-500 rounded-md px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      type="button"
                      disabled={isProcessingOption || isFirst}
                      onClick={() => handleMoveOption(option.id, "up")}
                    >
                      Move Up
                    </button>

                    <button
                      className="border-[0.1rem] border-gray-500 rounded-md px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      type="button"
                      disabled={isProcessingOption || isLast}
                      onClick={() => handleMoveOption(option.id, "down")}
                    >
                      Move Down
                    </button>

                    <span>Order: {option.order}</span>

                    <button
                      className="bg-emerald-300 border-[0.1rem] border-emerald-500 rounded-md text-emerald-900 px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      type="submit"
                      disabled={isProcessingOption}
                    >
                      {isProcessingOption ? "Saving..." : "Save"}
                    </button>

                    <button
                      className="bg-red-300 border-[0.1rem] border-red-500 rounded-md text-red-900 px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      type="button"
                      disabled={isProcessingOption}
                      onClick={() => handleDeleteOption(option.id)}
                    >
                      Delete
                    </button>
                  </div>
                </fieldset>
              </form>
            );
          })}
        </div>
      )}
    </>
  );
}
