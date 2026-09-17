import ChevronIcon from "@/components/icons/chevron";
import type { Dispatch, InputEvent, SetStateAction, SubmitEvent } from "react";
import IsSyncedCheckbox from "../IsSyncedCheckbox";
import RequiredField from "../RequiredField";

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

const inputClass =
  "mt-1 block w-full rounded-lg border-[0.1rem] border-b-[0.2rem] border-blue-400 bg-gray-100 px-3 py-2 disabled:opacity-50";

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
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      onSubmit={handleSubmit}
      onInput={handleFormInput}
    >
      <div className="space-y-6 p-5 sm:p-6">
        <fieldset disabled={isLoading}>
          <legend className="text-base font-semibold text-gray-900">
            {legend}
          </legend>

          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="category-name"
                className="font-medium text-gray-900"
              >
                Name
                <RequiredField />
              </label>
              <input
                className={inputClass}
                id="category-name"
                name="name"
                type="text"
                required
              />
            </div>

            <div>
              <label
                htmlFor="category-description"
                className="font-medium text-gray-900"
              >
                Description
              </label>
              <textarea
                className={inputClass}
                id="category-description"
                name="description"
                rows={4}
              />
            </div>
          </div>
        </fieldset>

        <div className="border-t border-gray-100 pt-5">
          <p className="text-sm font-medium text-gray-900">Display Order</p>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            A lower order appears first on your website. You can reorder{" "}
            {legend === "Category info"
              ? "categories in the categories list"
              : legend === "Subcategory info"
                ? "subcategories in the subcategories list"
                : "entries in their list"}{" "}
            using the{" "}
            <span className="inline-flex items-center align-middle">
              <ChevronIcon direction="up" size={18} />
            </span>{" "}
            and{" "}
            <span className="inline-flex items-center align-middle">
              <ChevronIcon direction="down" size={18} />
            </span>{" "}
            buttons.
          </p>

          <p className="mt-3 inline-flex rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
            Display Order: {latestOrder}
          </p>
        </div>

        <IsSyncedCheckbox
          hasSyncGroup={hasSyncGroup}
          htmlFor={`sync-${legend === "Category info" ? "category" : "subcategory"}`}
          inputName={`sync-${legend === "Category info" ? "category" : "subcategory"}`}
          isSynced={isSynced}
          setIsSynced={setIsSynced}
          isSaving={isCreating}
          description={`All locations will get their own version of this ${legend === "Category info" ? "category" : "subcategory"} and will stay in sync between updates`}
        />

        {errorMessage && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        )}
      </div>

      <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-5 py-4 sm:px-6">
        <button
          className="rounded-lg border border-emerald-500 bg-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          type="submit"
          disabled={isLoading || !canSubmit}
        >
          {isLoading ? "Creating..." : "Create"}
        </button>
      </div>
    </form>
  );
}
