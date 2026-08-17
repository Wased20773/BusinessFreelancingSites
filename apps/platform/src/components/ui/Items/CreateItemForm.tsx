import ChevronIcon from "@/components/icons/chevron";
import { InputEvent, SubmitEvent } from "react";

type CreateItemFormProps = {
  handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  handleFormInput(event: InputEvent<HTMLFormElement>): void;
  isLoading: boolean;
  errorMessage: string | null;
  canSubmit: boolean;
  latestOrder: number;
};

export default function CreateItemForm({
  handleSubmit,
  handleFormInput,
  isLoading,
  errorMessage,
  canSubmit,
  latestOrder,
}: CreateItemFormProps) {
  return (
    <form
      className="dashboard-card flex flex-col gap-5 p-4"
      onSubmit={handleSubmit}
      onInput={handleFormInput}
    >
      <fieldset disabled={isLoading}>
        <legend>Item info</legend>

        <div>
          <label htmlFor="item-name">Name</label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="item-name"
            name="name"
            type="text"
          />
        </div>

        <div>
          <label htmlFor="item-description">Description</label>

          <textarea
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="item-description"
            name="description"
            rows={4}
          />
        </div>

        <div>
          <label htmlFor="item-contains">
            What does the item contain? Please separate with a comma.
          </label>
          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="item-contains"
            name="containsList"
            type="text"
            placeholder="pepper, salt, onions ..."
          />
        </div>

        <div>
          <label htmlFor="item-calories">Calories (kcal)</label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="item-calories"
            name="calories"
            type="number"
            min="0"
            step="10"
          />
        </div>

        <div>
          <label htmlFor="item-image">Image</label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="item-image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
          />
        </div>

        <div>
          <label htmlFor="item-price">
            Price (For items with options inside, set this item price to 0)
          </label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="item-price"
            name="price"
            type="number"
            min="0"
            step="0.10"
          />
        </div>
      </fieldset>

      <fieldset disabled={isLoading}>
        <legend>Availability</legend>

        <label htmlFor="item-available" className="cursor-pointer">
          <input
            className="mr-2"
            id="item-available"
            name="isAvailable"
            type="checkbox"
            defaultChecked
          />
          Available?
        </label>
      </fieldset>

      <div>
        <p className="font-semibold">Display Order</p>

        <p>
          A lower order appear first on your website. You can reorder any item
          when viewing your items list with the{" "}
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
        Display Order: {latestOrder + 1}
      </p>

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
