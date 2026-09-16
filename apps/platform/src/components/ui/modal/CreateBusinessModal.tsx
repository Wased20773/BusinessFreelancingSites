import Image from "next/image";
import {
  Dispatch,
  SetStateAction,
  SubmitEvent,
  useMemo,
  useState,
} from "react";
import ExitIcon from "@/components/icons/exit-black.svg";
import RequiredField from "../RequiredField";
import { GenericSelect } from "../select/GenericSelect";
import { Country, State, City } from "country-state-city";

type CreateBusinessModalProps = {
  isSubmitting: boolean;
  setIsCreatingBusiness: Dispatch<SetStateAction<boolean>>;
  handleCreateBusiness(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  createErrorMessage: string | null;
};

export default function CreateBusinessModal({
  isSubmitting,
  setIsCreatingBusiness,
  handleCreateBusiness,
  createErrorMessage,
}: CreateBusinessModalProps) {
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [stateCode, setStateCode] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5"
      onMouseDown={() => {
        if (!isSubmitting) {
          setIsCreatingBusiness(false);
        }
      }}
    >
      <div
        className="w-full max-w-[600px] bg-white border-[0.1rem] border-gray-300 rounded-lg px-5 py-5"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Modal Heading */}
        <div className="flex justify-between items-start gap-5">
          <div>
            <h2 className="text-xl font-semibold">Create Business</h2>

            <p className="text-gray-500 mt-1">
              Create a business and its first location.
            </p>
          </div>

          <button
            className="text-2xl leading-none disabled:opacity-50"
            type="button"
            aria-label="Close create business form"
            disabled={isSubmitting}
            onClick={() => setIsCreatingBusiness(false)}
          >
            <Image src={ExitIcon} alt="" width={20} height={20} />
          </button>
        </div>

        {/* Form */}
        <form
          className="flex flex-col gap-4 mt-5"
          onSubmit={handleCreateBusiness}
        >
          {/* Business Name */}
          <div>
            <label className="font-semibold" htmlFor="create-business-name">
              Business Name <RequiredField />
            </label>

            <input
              className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 mt-1 disabled:opacity-50"
              id="create-business-name"
              name="name"
              type="text"
              placeholder="Enter your business name"
              disabled={isSubmitting}
              required
            />
          </div>

          {/* First Location */}
          {/* Address */}
          <div>
            <label className="font-semibold" htmlFor="create-location-address">
              Address
              <RequiredField />
            </label>

            <input
              className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 mt-1 disabled:opacity-50"
              id="create-location-address"
              name="address"
              type="text"
              placeholder="Enter the business address"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="grid grid-cols-[3fr_1fr] grid-rows-2 md:grid-cols-[2fr_1fr_1fr_auto] md:grid-rows-1 gap-3">
            {/* Country */}
            <div>
              <label
                className="font-semibold"
                htmlFor="create-location-country"
              >
                Country
              </label>
              <GenericSelect
                placeholder={"Select Country"}
                items={countries}
                setSelected={(countryCode) => {
                  setCountryCode(countryCode);
                  setStateCode(null);
                }}
              />
              <input type="hidden" name="country" value={countryCode ?? ""} />
            </div>

            {/* State */}
            <div>
              <label className="font-semibold" htmlFor="create-location-state">
                State
              </label>
              <GenericSelect
                placeholder={"Select State"}
                items={countryCode ? states : null}
                setSelected={setStateCode}
              />
              <input type="hidden" name="state" value={stateCode ?? ""} />
            </div>

            {/* City */}
            <div>
              <label className="font-semibold" htmlFor="create-location-city">
                City
              </label>
              <GenericSelect
                placeholder={"Select City"}
                items={stateCode ? cities : null}
                setSelected={setSelectedCity}
              />
              <input type="hidden" name="city" value={selectedCity ?? ""} />
            </div>

            {/* Zip */}
            <div className="col-span-2 md:col-span-1">
              <label className="font-semibold" htmlFor="create-location-zip">
                ZIP / Postal Code
              </label>
              <input
                className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 disabled:opacity-50"
                id="create-location-zip"
                name="zip"
                type="text"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Parking */}
          <div>
            <label
              className="font-semibold flex"
              htmlFor="create-location-parking"
            >
              <input
                className="disabled:opacity-50 mr-2"
                id="create-location-parking"
                name="parking"
                type="checkbox"
                disabled={isSubmitting}
              />
              <span className="font-semibold">Parking Available</span>
            </label>
            <p className="text-sm text-gray-500 mt-1">
              Select this if customers have access to parking at this location.
            </p>
          </div>

          {/* Error */}
          {createErrorMessage && (
            <p className="text-red-500 bg-red-100 border-[0.1rem] border-red-500 rounded-lg px-2 py-1">
              {createErrorMessage}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-3">
            <button
              className="border-[0.1rem] border-gray-400 rounded-lg px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsCreatingBusiness(false)}
            >
              Cancel
            </button>

            <button
              className="bg-emerald-300 border-[0.1rem] border-green-500 rounded-lg text-green-900 px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Business"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
