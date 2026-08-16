import { CategoryJson } from "@/types/types";
import { InputEvent, SubmitEvent } from "react";
import "@/app/dashboard/(protected)/page.css";

type EditCategoryFormParams = {
  handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  handleFormInput(event: InputEvent<HTMLFormElement>): void;
  isProcessing: boolean;
  categoryData: CategoryJson;
  errorMessage: string | null;
  canSubmit: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  handleDelete(): Promise<void>;
};

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
}: EditCategoryFormParams) {
  return (
    <form
      className="dashboard-card flex flex-col gap-5 p-4"
      onSubmit={handleSubmit}
      onInput={handleFormInput}
    >
      <fieldset disabled={isProcessing}>
        <legend>
          {categoryData.parentId ? "Subcategory info" : "Category info"}
        </legend>

        <div>
          <label htmlFor="category-name">Name</label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="category-name"
            name="name"
            type="text"
            defaultValue={categoryData.name}
          />
        </div>

        <div>
          <label htmlFor="category-description">Description</label>

          <textarea
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="category-description"
            name="description"
            rows={4}
            defaultValue={categoryData.description ?? ""}
          />
        </div>
      </fieldset>

      <fieldset disabled={isProcessing}>
        <legend>Display</legend>

        <label htmlFor="category-visible" className="cursor-pointer">
          <input
            className="mr-2"
            id="category-visible"
            name="isVisible"
            type="checkbox"
            defaultChecked={categoryData.isVisible}
          />
          Visible?
        </label>

        <div>
          <label htmlFor="category-order">Order</label>

          <span
            className="block w-fit border-[0.1rem] border-b-[0.2rem] rounded-lg border-gray-300 bg-gray-100 px-3 py-2"
            id="category-order"
          >
            {categoryData.order}
          </span>
        </div>
      </fieldset>

      {errorMessage && <p role="alert">{errorMessage}</p>}

      <button
        className="bg-emerald-300 border-[0.1rem] border-emerald-500 rounded-md text-emerald-900 px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        type="submit"
        disabled={isProcessing || !canSubmit}
      >
        {isSaving ? "Saving..." : "Save"}
      </button>

      <button
        className="bg-red-300 border-[0.1rem] border-red-500 rounded-md text-red-900 px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        type="button"
        disabled={isProcessing}
        onClick={handleDelete}
      >
        {isDeleting ? "Deleting..." : "Delete Category"}
      </button>
    </form>
  );
}
