import { InputEvent, SubmitEvent } from "react";

type CreateCategoryFormParams = {
  handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  handleFormInput(event: InputEvent<HTMLFormElement>): void;
  isLoading: boolean;
  canSubmit: boolean;
  legend: string;
};

export default function CreateCategoryForm({
  legend,
  handleSubmit,
  handleFormInput,
  isLoading,
  canSubmit,
}: CreateCategoryFormParams) {
  return (
    <form
      className="dashboard-card flex flex-col gap-5 p-4"
      onSubmit={handleSubmit}
      onInput={handleFormInput}
    >
      <fieldset disabled={isLoading}>
        <legend>{legend}</legend>

        <div>
          <label htmlFor="category-name">Name</label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="category-name"
            name="name"
            type="text"
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
