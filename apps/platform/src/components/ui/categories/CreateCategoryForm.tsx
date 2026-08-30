import ChevronIcon from "@/components/icons/chevron";
import { Dispatch, InputEvent, SetStateAction, SubmitEvent } from "react";
import RequiredField from "../RequiredField";
import IsSyncedCheckbox from "../IsSyncedCheckbox";

type CreateCategoryFormProps = {
  handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  handleFormInput(event: InputEvent<HTMLFormElement>): void;
  isLoading: boolean;
  errorMessage: string | null;
  canSubmit: boolean;
  legend: string;
  isCreating: boolean;
  latestOrder: number;
  isSynced: boolean;
  setIsSynced: Dispatch<SetStateAction<boolean>>;
  hasSyncGroup: boolean;
};

export default function CreateCategoryForm({
  legend,
  handleSubmit,
  handleFormInput,
  isLoading,
  canSubmit,
  latestOrder,
  isCreating,
  errorMessage,
  isSynced,
  setIsSynced,
  hasSyncGroup,
}: CreateCategoryFormProps) {
  return (
    <form
      className="dashboard-card flex flex-col gap-5 p-4"
      onSubmit={handleSubmit}
      onInput={handleFormInput}
    >
      <fieldset disabled={isLoading}>
        <legend>{legend}</legend>

        <div>
          <label htmlFor="category-name">
            Name
            <RequiredField />
          </label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="category-name"
            name="name"
            type="text"
            required
          />
        </div>

        <div>
          <label htmlFor="category-description">Description</label>

          <textarea
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="category-description"
            name="description"
            rows={4}
          />
        </div>
      </fieldset>

      <div>
        <p className="font-semibold">Display Order</p>

        <p>
          A lower order appear first on your website. You can reorder{" "}
          {legend === "Category info"
            ? "any category when viewing your categories list"
            : legend === "Subcategory info"
              ? "any subcategory when viewing your subcategories list"
              : "any when viewing its list"}{" "}
          with the{" "}
          <span className="inline-flex items-center align-middle">
            <ChevronIcon direction="up" size={20} />
          </span>{" "}
          or{" "}
          <span className="inline-flex items-center align-middle">
            <ChevronIcon direction="down" size={20} />
          </span>{" "}
          buttons.
        </p>
      </div>

      <p className="w-fit border-[0.1rem] border-b-[0.2rem] rounded-lg border-gray-400 bg-gray-100 px-3 py-2">
        Display Order: {latestOrder}
      </p>

      <IsSyncedCheckbox
        hasSyncGroup={hasSyncGroup}
        htmlFor={"sync-subcategory"}
        inputName={"sync-subcategory"}
        isSynced={isSynced}
        setIsSynced={setIsSynced}
        isSaving={isCreating}
        description={
          "All locations will get there own version of this subcategory and will stay in sync between updates"
        }
      />

      {errorMessage && <p role="alert">{errorMessage}</p>}

      <button
        className="bg-emerald-300 border-[0.1rem] border-emerald-500 rounded-md text-emerald-900 px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        type="submit"
        disabled={isLoading || !canSubmit}
      >
        {isLoading ? "Creating..." : "Create"}
      </button>
    </form>
  );
}
