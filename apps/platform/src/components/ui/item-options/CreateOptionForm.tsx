import { Dispatch, SetStateAction, SubmitEvent } from "react";
import RequiredField from "../RequiredField";
import IsSyncedCheckbox from "../IsSyncedCheckbox";

type CreateOptionFormParams = {
  handleCreateOption(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  isCreatingOption: boolean;
  hasSyncGroup: boolean;
  isSynced: boolean;
  setIsSynced: Dispatch<SetStateAction<boolean>>;
};

export default function CreateOptionForm({
  handleCreateOption,
  isCreatingOption,
  hasSyncGroup,
  isSynced,
  setIsSynced,
}: CreateOptionFormParams) {
  return (
    <form
      className="py-4 border-b border-gray-300"
      onSubmit={handleCreateOption}
    >
      <fieldset
        className="grid gap-3 md:grid-cols-[1fr_150px_auto]"
        disabled={isCreatingOption}
      >
        <div>
          <label htmlFor="new-option-name">
            Name
            <RequiredField />
          </label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="new-option-name"
            name="name"
            type="text"
            placeholder="Extra Cheese"
            required
          />
        </div>

        <div>
          <label htmlFor="new-option-price">
            Price
            <RequiredField />
          </label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="new-option-price"
            name="price"
            type="number"
            min="0"
            step="0.01"
            placeholder="1.50"
            required
          />
        </div>

        <IsSyncedCheckbox
          hasSyncGroup={hasSyncGroup}
          htmlFor={"sync-item-option"}
          inputName={"sync-item-option"}
          isSynced={isSynced}
          setIsSynced={setIsSynced}
          isSaving={isCreatingOption}
          description={"Adding synchronization"}
        />

        <button
          className="w-fit ml-auto bg-emerald-300 border-[0.1rem] border-emerald-500 rounded-md text-emerald-900 px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          type="submit"
          disabled={isCreatingOption}
        >
          {isCreatingOption ? "Adding..." : "Add Option"}
        </button>
      </fieldset>
    </form>
  );
}
