import { ReorderDirection } from "@/lib/api/reorder";
import { ItemOptionsJson } from "@/types/types";
import { SubmitEvent, useState } from "react";
import ReorderControls from "../controls/ReorderControls";
import RequiredField from "../RequiredField";
import IsSyncedCheckbox from "../IsSyncedCheckbox";

type ExistingOptionsFormProps = {
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

  handleDeleteOption(
    event: React.MouseEvent<HTMLButtonElement>,
    optionId: string,
  ): Promise<void>;

  isDeletingOption: boolean;
};

type ExistingOptionProps = {
  option: ItemOptionsJson;
  isFirst: boolean;
  isLast: boolean;
  isProcessingOption: boolean;
  isDeletingOption: boolean;

  handleUpdateOption(
    event: SubmitEvent<HTMLFormElement>,
    optionId: string,
  ): Promise<void>;

  handleMoveOption(
    optionId: string,
    direction: ReorderDirection,
  ): Promise<void>;

  handleDeleteOption(
    event: React.MouseEvent<HTMLButtonElement>,
    optionId: string,
  ): Promise<void>;
};

function ExistingOption({
  option,
  isFirst,
  isLast,
  isProcessingOption,
  isDeletingOption,
  handleUpdateOption,
  handleMoveOption,
  handleDeleteOption,
}: ExistingOptionProps) {
  const [isSynced, setIsSynced] = useState<boolean>(option.isSynced);

  return (
    <form
      className="border-b border-gray-300 py-4 last:border-b-0"
      onSubmit={(event) => handleUpdateOption(event, option.id)}
    >
      <fieldset className="grid gap-3" disabled={isProcessingOption}>
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor={`option-name-${option.id}`}>
              Name
              <RequiredField />
            </label>

            <input
              className="min-w-0 block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
              id={`option-name-${option.id}`}
              name="name"
              type="text"
              defaultValue={option.name}
              required
            />
          </div>

          <div>
            <label htmlFor={`option-price-${option.id}`}>
              Price
              <RequiredField />
            </label>

            <input
              className="min-w-0 max-w-[100px] block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
              id={`option-price-${option.id}`}
              name="price"
              type="number"
              min="0"
              step="0.01"
              defaultValue={Number(option.price)}
              required
            />
          </div>
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

        <IsSyncedCheckbox
          hasSyncGroup={Boolean(option.syncGroupId)}
          htmlFor={`sync-item-option-${option.id}`}
          inputName="sync-item-option"
          isSynced={isSynced}
          setIsSynced={setIsSynced}
          isSaving={isProcessingOption}
          description="Apply changes to synchronized options"
        />

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 px-3 flex items-center gap-5">
            <ReorderControls
              id={option.id}
              isProcessing={isProcessingOption}
              isFirst={isFirst}
              isLast={isLast}
              handleMove={handleMoveOption}
            />

            <div className="flex-1 min-w-0">
              <p className="text-gray-500 truncate">Order: {option.order}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="bg-emerald-300 border-[0.1rem] border-emerald-500 rounded-md text-emerald-900 px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              type="submit"
              disabled={isProcessingOption}
            >
              {isProcessingOption && !isDeletingOption ? "Saving..." : "Save"}
            </button>

            <button
              className="bg-red-300 border-[0.1rem] border-red-500 rounded-md text-red-900 px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
              disabled={isProcessingOption}
              onClick={(event) => handleDeleteOption(event, option.id)}
            >
              {isProcessingOption && isDeletingOption
                ? "Deleting..."
                : "Delete"}
            </button>
          </div>
        </div>
      </fieldset>
    </form>
  );
}

export default function ExistingOptionsForm({
  options,
  processingOptionId,
  handleUpdateOption,
  handleMoveOption,
  handleDeleteOption,
  isDeletingOption,
}: ExistingOptionsFormProps) {
  return (
    <>
      {options.length === 0 ? (
        <p className="pt-4">This item has no options</p>
      ) : (
        <div>
          {options.map((option, idx) => {
            const isProcessingOption = processingOptionId === option.id;

            const isFirst = idx === 0;
            const isLast = idx === options.length - 1;

            return (
              <ExistingOption
                key={option.id}
                option={option}
                isFirst={isFirst}
                isLast={isLast}
                isProcessingOption={isProcessingOption}
                isDeletingOption={isDeletingOption}
                handleUpdateOption={handleUpdateOption}
                handleMoveOption={handleMoveOption}
                handleDeleteOption={handleDeleteOption}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
