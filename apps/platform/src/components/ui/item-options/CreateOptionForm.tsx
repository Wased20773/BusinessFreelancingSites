import { SubmitEvent } from "react";
import RequiredField from "../RequiredField";

type CreateOptionFormParams = {
  handleCreateOption(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  isCreatingOption: boolean;
};

export default function CreateOptionForm({
  handleCreateOption,
  isCreatingOption,
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
            step="0.10"
            placeholder="1.50"
            required
          />
        </div>

        <button
          className="self-end bg-emerald-300 border-[0.1rem] border-emerald-500 rounded-md text-emerald-900 px-3 py-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          type="submit"
          disabled={isCreatingOption}
        >
          {isCreatingOption ? "Adding..." : "Add Option"}
        </button>
      </fieldset>
    </form>
  );
}
