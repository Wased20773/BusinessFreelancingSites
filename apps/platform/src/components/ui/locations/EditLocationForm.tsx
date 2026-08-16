import { LocationJson } from "@/types/types";
import { InputEvent, SubmitEvent } from "react";
import "@/app/dashboard/(protected)/page.css";

type EditLocationFormProps = {
  handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  handleFormInput(event: InputEvent<HTMLFormElement>): void;
  isProcessing: boolean;
  locationData: LocationJson;
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
  locationData,
  errorMessage,
  canSubmit,
  isSaving,
  isDeleting,
}: EditLocationFormProps) {
  return (
    <form
      className="dashboard-card flex flex-col gap-5 p-4"
      onSubmit={handleSubmit}
      onInput={handleFormInput}
    >
      <fieldset disabled={isProcessing}>
        <legend>Location Info</legend>

        <div>
          <label htmlFor="location-address">Address</label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="location-address"
            name="address"
            type="text"
            defaultValue={locationData.address}
          />
        </div>

        <div>
          <label htmlFor="location-city">City</label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="location-city"
            name="city"
            type="text"
            defaultValue={locationData.city ?? ""}
          />
        </div>

        <div>
          <label htmlFor="location-state">State</label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="location-state"
            name="state"
            type="text"
            defaultValue={locationData.state ?? ""}
          />
        </div>

        <div>
          <label htmlFor="location-zip">Zip</label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="location-zip"
            name="zip"
            type="text"
            defaultValue={locationData.zip ?? ""}
          />
        </div>

        <div>
          <label htmlFor="location-country">Country</label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="location-country"
            name="country"
            type="text"
            defaultValue={locationData.country ?? ""}
          />
        </div>
      </fieldset>

      <fieldset disabled={isProcessing}>
        <legend>Location Setting</legend>

        <label htmlFor="location-parking" className="cursor-pointer">
          <input
            className="mr-2"
            id="location-parking"
            name="parking"
            type="checkbox"
            defaultChecked={locationData.parking}
          />
          Is there legal parking (street/curb, private, paid)?
        </label>

        <label htmlFor="location-isActive" className="cursor-pointer">
          <input
            className="mr-2"
            id="location-isActive"
            name="isActive"
            type="checkbox"
            defaultChecked={locationData.isActive}
          />
          Is this location currently active? If not, this location will not show
          in your business website.
        </label>

        <label htmlFor="location-enableHours" className="cursor-pointer">
          <input
            className="mr-2"
            id="location-enableHours"
            name="enableHours"
            type="checkbox"
            defaultChecked={locationData.enableHours}
          />
          Do you want to enable working hours? This will show your business
          working hours in your website.
        </label>
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
        {isDeleting ? "Deleting..." : "Delete Location"}
      </button>
    </form>
  );
}
