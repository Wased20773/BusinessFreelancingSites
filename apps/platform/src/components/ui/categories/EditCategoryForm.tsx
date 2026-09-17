import Divider from "@/components/layout/Divider";
import type { CategoryJson } from "@/types/types";
import type { Dispatch, InputEvent, SetStateAction, SubmitEvent } from "react";
import IsSyncedCheckbox from "../IsSyncedCheckbox";
import RequiredField from "../RequiredField";

type EditCategoryFormParams = {
  handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  handleFormInput(event: InputEvent<HTMLFormElement>): void;
  isProcessing: boolean;
  categoryData: CategoryJson;
  errorMessage: string | null;
  canSubmit: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  isSynced: boolean;
  setIsSynced: Dispatch<SetStateAction<boolean>>;
  handleDelete(): Promise<void>;
};

const inputClass =
  "mt-1 block w-full rounded-lg border-[0.1rem] border-b-[0.2rem] border-blue-400 bg-gray-100 px-3 py-2 disabled:opacity-50";

export default function EditCategoryForm({
  handleSubmit,
  handleFormInput,
  handleDelete,
  isProcessing,
  categoryData,
  errorMessage,
  canSubmit,
  isSaving,
  isDeleting,
  isSynced,
  setIsSynced,
}: EditCategoryFormParams) {
  const hasSyncGroup = Boolean(categoryData.syncGroupId);

  return (
    <form
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      onSubmit={handleSubmit}
      onInput={handleFormInput}
    >
      <div className="p-5 sm:p-6">
        <fieldset disabled={isProcessing} className="mb-5">
          <legend className="text-base font-semibold text-gray-900">
            {categoryData.parentId ? "Subcategory info" : "Category info"}
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
                defaultValue={categoryData.name}
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
                defaultValue={categoryData.description ?? ""}
              />
            </div>
          </div>
        </fieldset>

        <fieldset disabled={isProcessing}>
          <legend className="text-base font-semibold text-gray-900">
            Display
          </legend>

          <label
            htmlFor="category-visible"
            className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-900"
          >
            <input
              id="category-visible"
              name="isVisible"
              type="checkbox"
              defaultChecked={categoryData.isVisible}
              className="size-4 accent-blue-600"
            />
            Visible?
          </label>
        </fieldset>

        <p className="mt-4 inline-flex rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
          Display Order: {categoryData.order}
        </p>

        {hasSyncGroup && (
          <>
            <Divider />
            <IsSyncedCheckbox
              hasSyncGroup={hasSyncGroup}
              htmlFor={`sync-${categoryData.parentId ? "subcategory" : "category"}`}
              inputName={`sync-${categoryData.parentId ? "subcategory" : "category"}`}
              isSynced={isSynced}
              setIsSynced={setIsSynced}
              isSaving={isSaving}
              description="Apply changes to synchronized copies across locations"
            />
          </>
        )}

        {errorMessage && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-300 bg-gray-50 px-5 py-4 sm:px-6">
        <button
          className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          type="button"
          disabled={isProcessing}
          onClick={handleDelete}
        >
          {isDeleting ? "Deleting..." : "Delete Category"}
        </button>

        <button
          className="rounded-lg border border-emerald-500 bg-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          type="submit"
          disabled={isProcessing || !canSubmit}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
