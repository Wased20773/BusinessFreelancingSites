"use client";

import "@/app/dashboard/(protected)/page.css";
import { InputEvent, SubmitEvent, useState } from "react";
import RequiredField from "../RequiredField";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

type Hour = {
  openTime: string;
  closeTime: string;
  title: string;
  note: string;
};

type DayHours = {
  isClosed: boolean;
  hours: Hour[];
};

type CreateLocationFormParams = {
  handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  handleFormInput(event: InputEvent<HTMLFormElement>): void;
  canSubmit: boolean;
  isLoading: boolean;
};

export default function CreateLocationForm({
  handleSubmit,
  handleFormInput,
  canSubmit,
  isLoading,
}: CreateLocationFormParams) {
  const [address, setAddress] = useState<string>("");

  return (
    <form
      className="dashboard-card flex flex-col gap-5"
      onSubmit={handleSubmit}
      onInput={handleFormInput}
    >
      <fieldset>
        <legend>Location Details</legend>

        <div>
          <label htmlFor="address">
            Address
            <RequiredField />
          </label>
          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="address"
            name="address"
            type="text"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="city">City</label>
          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="city"
            name="city"
            type="text"
          />
        </div>

        <div>
          <label htmlFor="state">State</label>
          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="state"
            name="state"
            type="text"
          />
        </div>

        <div>
          <label htmlFor="zip">ZIP / Postal Code</label>
          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="zip"
            name="zip"
            type="text"
          />
        </div>

        <div>
          <label htmlFor="country">Country</label>
          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="country"
            name="country"
            type="text"
          />
        </div>
      </fieldset>

      <fieldset>
        <legend>Location Settings</legend>

        <p>
          Parking is essential knowledge for customers.{" "}
          <span className="font-semibold">Legal parking</span> (Street/curb,
          private, paid) qualify as available parking
        </p>

        <label htmlFor="parking" className="cursor-pointer">
          <input className="mr-2" id="parking" name="parking" type="checkbox" />
          Parking Available?
        </label>

        <div>
          <p className="font-semibold">Why do we ask this?</p>
          <p>
            Providing parking information helps customers know what to expect
            before visiting your location. It can save them time when planning
            their visit and help customers searching online for parking
            information about your business.
          </p>
        </div>
      </fieldset>

      <button
        className="w-full sm:w-[50%] sm:mx-auto md:w-fit md:mr-auto md:ml-0 bg-emerald-300 border-[0.1rem] border-green-500 rounded-lg text-green-900 px-3 py-1 mt-5 disabled:opacity-50 disabled:cursor-not-allowed"
        type="submit"
        disabled={!canSubmit || isLoading}
      >
        {isLoading ? "Creating..." : "Create"}
      </button>
    </form>
  );
}
