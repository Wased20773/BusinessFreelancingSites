import { LocationJson } from "@/types/types";
import { InputEvent, SubmitEvent, useMemo, useState } from "react";

import "@/app/dashboard/(protected)/page.css";

import RequiredField from "../RequiredField";
import { GenericSelect } from "../select/GenericSelect";

import { Country, State, City } from "country-state-city";

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
  /*
   * Existing saved values.
   *
   * Country and state are stored using their codes:
   *
   * country = "US"
   * state = "OR"
   * city = "Portland"
   */
  const [countryCode, setCountryCode] = useState<string | null>(
    locationData.country ?? null,
  );

  const [stateCode, setStateCode] = useState<string | null>(
    locationData.state ?? null,
  );

  const [selectedCity, setSelectedCity] = useState<string | null>(
    locationData.city ?? null,
  );

  /*
   * Countries
   */
  const countries = Country.getAllCountries().map((country) => ({
    name: country.name,
    key: country.isoCode,
  }));

  /*
   * States belonging to the selected country.
   */
  const states = useMemo(() => {
    if (!countryCode) return null;

    return State.getAllStates()
      .filter((state) => state.countryCode === countryCode)
      .map((state) => ({
        name: state.name,
        key: state.isoCode,
      }));
  }, [countryCode]);

  /*
   * Cities belonging to the selected country/state.
   */
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
      className="dashboard-card p-4"
      onSubmit={handleSubmit}
      onInput={handleFormInput}
    >
      {/* ######################### */}
      {/* ##### Location Info ##### */}
      {/* ######################### */}

      <fieldset className="mb-5" disabled={isProcessing}>
        <legend>Location Info</legend>

        <div className="flex flex-col gap-4">
          {/* Address */}
          <div>
            <label className="font-semibold" htmlFor="location-address">
              Address
              <RequiredField />
            </label>

            <input
              className="
                block w-full
                border-[0.1rem] border-b-[0.2rem]
                rounded-lg border-blue-400
                bg-gray-100
                px-3 py-2 mt-1
                disabled:opacity-50
              "
              id="location-address"
              name="address"
              type="text"
              defaultValue={locationData.address}
              placeholder="Enter the business address"
              required
            />
          </div>

          {/* Country / State / City / ZIP */}
          <div
            className="
              grid
              grid-cols-[3fr_1fr]
              grid-rows-2
              md:grid-cols-[2fr_1fr_1fr_auto]
              md:grid-rows-1
              gap-3
            "
          >
            {/* Country */}
            <div>
              <label className="font-semibold" htmlFor="location-country">
                Country
              </label>

              <GenericSelect
                placeholder="Select Country"
                items={countries}
                defaultValue={countryCode ?? undefined}
                setSelected={(newCountryCode) => {
                  setCountryCode(newCountryCode);

                  /*
                   * Changing country invalidates the
                   * existing state and city.
                   */
                  setStateCode(null);
                  setSelectedCity(null);

                  notifyFormChange();
                }}
              />

              <input type="hidden" name="country" value={countryCode ?? ""} />
            </div>

            {/* State */}
            <div>
              <label className="font-semibold" htmlFor="location-state">
                State
              </label>

              <GenericSelect
                placeholder="Select State"
                items={countryCode ? states : null}
                defaultValue={stateCode ?? undefined}
                setSelected={(newStateCode) => {
                  setStateCode(newStateCode);

                  /*
                   * Changing state invalidates the
                   * existing city.
                   */
                  setSelectedCity(null);

                  notifyFormChange();
                }}
              />

              <input type="hidden" name="state" value={stateCode ?? ""} />
            </div>

            {/* City */}
            <div>
              <label className="font-semibold" htmlFor="location-city">
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

            {/* ZIP */}
            <div className="col-span-2 md:col-span-1">
              <label className="font-semibold" htmlFor="location-zip">
                ZIP / Postal Code
              </label>

              <input
                className="
                  block w-[75px]
                  border-[0.1rem] border-b-[0.2rem]
                  rounded-lg border-blue-400
                  bg-gray-100
                  px-3 py-2
                  disabled:opacity-50
                "
                id="location-zip"
                name="zip"
                type="text"
                defaultValue={locationData.zip ?? ""}
              />
            </div>
          </div>
        </div>
      </fieldset>

      {/* ############################# */}
      {/* ##### Location Settings ##### */}
      {/* ############################# */}

      <fieldset className="mb-5" disabled={isProcessing}>
        <legend>Location Settings</legend>

        <div className="flex flex-col gap-4">
          {/* Parking */}
          <div>
            <label className="font-semibold flex" htmlFor="location-parking">
              <input
                className="disabled:opacity-50 mr-2"
                id="location-parking"
                name="parking"
                type="checkbox"
                defaultChecked={locationData.parking}
              />

              <span className="font-semibold">Parking Available</span>
            </label>

            <p className="text-sm text-gray-500 mt-1">
              Select this if customers have access to parking at this location.
            </p>
          </div>

          {/* Active */}
          <div>
            <label
              className="font-semibold flex cursor-pointer"
              htmlFor="location-isActive"
            >
              <input
                className="disabled:opacity-50 mr-2"
                id="location-isActive"
                name="isActive"
                type="checkbox"
                defaultChecked={locationData.isActive}
              />

              <span className="font-semibold">Location Active</span>
            </label>

            <p className="text-sm text-gray-500 mt-1">
              Disable this to prevent the location from appearing on your
              business website.
            </p>
          </div>

          {/* Working Hours */}
          <div>
            <label
              className="font-semibold flex cursor-pointer"
              htmlFor="location-enableHours"
            >
              <input
                className="disabled:opacity-50 mr-2"
                id="location-enableHours"
                name="enableHours"
                type="checkbox"
                defaultChecked={locationData.enableHours}
              />

              <span className="font-semibold">Enable Working Hours</span>
            </label>

            <p className="text-sm text-gray-500 mt-1">
              Enable this to display this location&apos;s working hours on your
              business website.
            </p>
          </div>
        </div>
      </fieldset>

      {/* Error */}
      {errorMessage && (
        <p
          role="alert"
          className="
            text-red-500
            bg-red-100
            border-[0.1rem] border-red-500
            rounded-lg
            px-2 py-1
            mb-4
          "
        >
          {errorMessage}
        </p>
      )}

      {/* ##################### */}
      {/* ##### Actions ####### */}
      {/* ##################### */}

      <div className="flex justify-between gap-3 mt-3">
        <button
          className="
            bg-red-300
            border-[0.1rem] border-red-500
            rounded-lg
            text-red-900
            px-3 py-1
            cursor-pointer
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
          type="button"
          disabled={isProcessing}
          onClick={handleDelete}
        >
          {isDeleting ? "Deleting..." : "Delete Location"}
        </button>

        <button
          className="
            bg-emerald-300
            border-[0.1rem] border-green-500
            rounded-lg
            text-green-900
            px-3 py-1
            cursor-pointer
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
          type="submit"
          disabled={isProcessing || !canSubmit}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
