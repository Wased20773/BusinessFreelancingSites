import type { LocationJson } from "@/types/types";
import { type InputEvent, type SubmitEvent, useMemo, useState } from "react";
import { City, Country, State } from "country-state-city";

import RequiredField from "../RequiredField";
import { GenericSelect } from "../select/GenericSelect";

type EditLocationFormProps = {
  handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  handleFormInput(event: InputEvent<HTMLFormElement>): void;
  isProcessing: boolean;
  locationData: LocationJson;
  errorMessage: string | null;
  canSubmit: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  handleDelete(): void;
};

const inputClass =
  "mt-1 block w-full rounded-lg border-[0.1rem] border-b-[0.2rem] border-blue-400 bg-gray-100 px-3 py-2 disabled:opacity-50";

export default function EditLocationForm({
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
  const [countryCode, setCountryCode] = useState<string | null>(
    locationData.country ?? null,
  );
  const [stateCode, setStateCode] = useState<string | null>(
    locationData.state ?? null,
  );
  const [selectedCity, setSelectedCity] = useState<string | null>(
    locationData.city ?? null,
  );

  const countries = Country.getAllCountries().map((country) => ({
    name: country.name,
    key: country.isoCode,
  }));

  const states = useMemo(() => {
    if (!countryCode) return null;

    return State.getAllStates()
      .filter((state) => state.countryCode === countryCode)
      .map((state) => ({
        name: state.name,
        key: state.isoCode,
      }));
  }, [countryCode]);

  const cities = useMemo(() => {
    if (!countryCode || !stateCode) return null;

    return City.getAllCities()
      .filter(
        (city) =>
          city.countryCode === countryCode && city.stateCode === stateCode,
      )
      .map((city) => ({
        name: city.name,
        key: city.name,
      }));
  }, [countryCode, stateCode]);

  function notifyFormChange() {
    requestAnimationFrame(() => {
      const form = document.getElementById(
        "edit-location-form",
      ) as HTMLFormElement | null;

      if (!form) return;

      form.dispatchEvent(
        new Event("input", {
          bubbles: true,
        }),
      );
    });
  }

  return (
    <form
      id="edit-location-form"
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      onSubmit={handleSubmit}
      onInput={handleFormInput}
    >
      <div className="space-y-6 px-5 py-4 sm:p-6">
        <fieldset disabled={isProcessing}>
          <legend className="text-base font-semibold text-gray-900">
            Location Info
          </legend>

          <div className="space-y-4">
            <div>
              <label
                className="font-medium text-gray-900"
                htmlFor="location-address"
              >
                Address
                <RequiredField />
              </label>
              <input
                className={inputClass}
                id="location-address"
                name="address"
                type="text"
                defaultValue={locationData.address}
                placeholder="Enter the business address"
                required
              />
            </div>

            <div className="flex flex-wrap items-start gap-3">
              <div className="w-[150px]">
                <label
                  className="font-medium text-gray-900"
                  htmlFor="location-country"
                >
                  Country
                </label>
                <GenericSelect
                  placeholder="Select Country"
                  items={countries}
                  defaultValue={countryCode ?? undefined}
                  setSelected={(newCountryCode) => {
                    setCountryCode(newCountryCode);
                    setStateCode(null);
                    setSelectedCity(null);
                    notifyFormChange();
                  }}
                />
                <input type="hidden" name="country" value={countryCode ?? ""} />
              </div>

              <div className="w-[150px]">
                <label
                  className="font-medium text-gray-900"
                  htmlFor="location-state"
                >
                  State
                </label>
                <GenericSelect
                  placeholder="Select State"
                  items={countryCode ? states : null}
                  defaultValue={stateCode ?? undefined}
                  setSelected={(newStateCode) => {
                    setStateCode(newStateCode);
                    setSelectedCity(null);
                    notifyFormChange();
                  }}
                />
                <input type="hidden" name="state" value={stateCode ?? ""} />
              </div>

              <div className="w-[150px]">
                <label
                  className="font-medium text-gray-900"
                  htmlFor="location-city"
                >
                  City
                </label>
                <GenericSelect
                  placeholder="Select City"
                  items={stateCode ? cities : null}
                  defaultValue={selectedCity ?? undefined}
                  setSelected={(newCity) => {
                    setSelectedCity(newCity);
                    notifyFormChange();
                  }}
                />
                <input type="hidden" name="city" value={selectedCity ?? ""} />
              </div>
            </div>

            <div>
              <label
                className="block font-medium text-gray-900"
                htmlFor="location-zip"
              >
                ZIP / Postal Code
              </label>
              <input
                className="block w-[100px] rounded-lg border-[0.1rem] border-b-[0.2rem] border-blue-400 bg-gray-100 px-3 py-2 disabled:opacity-50"
                id="location-zip"
                name="zip"
                type="text"
                defaultValue={locationData.zip ?? ""}
              />
            </div>
          </div>
        </fieldset>

        <fieldset disabled={isProcessing}>
          <legend className="text-base font-semibold text-gray-900">
            Location Settings
          </legend>

          <div className="space-y-4">
            <div>
              <label
                className="flex cursor-pointer items-center gap-2 font-medium text-gray-900"
                htmlFor="location-parking"
              >
                <input
                  className="disabled:opacity-50"
                  id="location-parking"
                  name="parking"
                  type="checkbox"
                  defaultChecked={locationData.parking}
                />
                Parking Available
              </label>
              <p className="mt-1 text-sm text-gray-600">
                Select this if customers have access to parking at this
                location.
              </p>
            </div>

            <div>
              <label
                className="flex cursor-pointer items-center gap-2 font-medium text-gray-900"
                htmlFor="location-isActive"
              >
                <input
                  className="disabled:opacity-50"
                  id="location-isActive"
                  name="isActive"
                  type="checkbox"
                  defaultChecked={locationData.isActive}
                />
                Location Active
              </label>
              <p className="mt-1 text-sm text-gray-600">
                Disable this to prevent the location from appearing on your
                business website.
              </p>
            </div>

            <div>
              <label
                className="flex cursor-pointer items-center gap-2 font-medium text-gray-900"
                htmlFor="location-enableHours"
              >
                <input
                  className="disabled:opacity-50"
                  id="location-enableHours"
                  name="enableHours"
                  type="checkbox"
                  defaultChecked={locationData.enableHours}
                />
                Enable Working Hours
              </label>
              <p className="mt-1 text-sm text-gray-600">
                Enable this to display this location&apos;s working hours on
                your business website.
              </p>
            </div>
          </div>
        </fieldset>

        {errorMessage && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:px-6">
        <button
          className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          type="button"
          disabled={isProcessing}
          onClick={handleDelete}
        >
          {isDeleting ? "Deleting..." : "Delete Location"}
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
