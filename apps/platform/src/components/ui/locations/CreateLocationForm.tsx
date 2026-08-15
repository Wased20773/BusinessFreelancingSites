"use client";

import "@/app/dashboard/(protected)/page.css";
import { InputEvent, SubmitEvent, useState } from "react";

import Image from "next/image";
import TrashIcon from "@/components/icons/trash-red.svg";

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
  const [days, setDays] = useState<Record<DayOfWeek, DayHours>>({
    Monday: {
      isClosed: false,
      hours: [
        {
          openTime: "",
          closeTime: "",
          title: "",
          note: "",
        },
      ],
    },
    Tuesday: {
      isClosed: false,
      hours: [
        {
          openTime: "",
          closeTime: "",
          title: "",
          note: "",
        },
      ],
    },
    Wednesday: {
      isClosed: false,
      hours: [
        {
          openTime: "",
          closeTime: "",
          title: "",
          note: "",
        },
      ],
    },
    Thursday: {
      isClosed: false,
      hours: [
        {
          openTime: "",
          closeTime: "",
          title: "",
          note: "",
        },
      ],
    },
    Friday: {
      isClosed: false,
      hours: [
        {
          openTime: "",
          closeTime: "",
          title: "",
          note: "",
        },
      ],
    },
    Saturday: {
      isClosed: false,
      hours: [
        {
          openTime: "",
          closeTime: "",
          title: "",
          note: "",
        },
      ],
    },
    Sunday: {
      isClosed: false,
      hours: [
        {
          openTime: "",
          closeTime: "",
          title: "",
          note: "",
        },
      ],
    },
  });
  const [enabledHours, setEnabledHours] = useState<boolean>(false);
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
          <label htmlFor="address">Address</label>
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
          Parking Available
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
      {/* 
      <fieldset>
        <legend>Business Days</legend>
        <p>
          Enabling this allows the addition to include working/open hours for
          your business per day.
        </p>

        <label htmlFor="enableHours" className="cursor-pointer">
          <input
            className="mr-2"
            id="enableHours"
            name="enableHours"
            type="checkbox"
            onChange={(event) => setEnabledHours(event.target.checked)}
          />
          Add Business Working Days?
        </label>
      </fieldset> */}

      {enabledHours && (
        <fieldset>
          <legend>Schedule</legend>
          <p>
            For each day, you must either enter both open and close times or
            check it off as closed on that day. You may add more working hours
            as needed by the business.
          </p>
          <p>
            Hours may not overlap with each other. For example, you may not have
            an open time of 12pm to 8pm and a open time of 5pm to 12am on the
            same day.
          </p>
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="dashboard-card !bg-neutral-100 flex flex-col"
            >
              <div className="flex justify-between items-center mb-5">
                <span className="font-semibold">{day}</span>

                <label
                  htmlFor={`${day}-isClosed`}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    id={`${day}-isClosed`}
                    name={`${day}-isClosed`}
                    type="checkbox"
                    checked={days[day].isClosed}
                    onChange={(event) => {
                      setDays((currentDays) => ({
                        ...currentDays,

                        [day]: {
                          ...currentDays[day],
                          isClosed: event.target.checked,
                        },
                      }));
                    }}
                  />
                  Closed
                </label>
              </div>

              {!days[day].isClosed && (
                <>
                  <div className="flex flex-col gap-5">
                    {days[day].hours.map((hour, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between items-center mb-2">
                          <p>Hours {idx + 1}</p>
                          {idx > 0 && (
                            <button
                              className="border-[0.1rem] border-red-300 rounded-lg p-1"
                              type="button"
                              onClick={() => {
                                setDays((currentDays) => ({
                                  ...currentDays,

                                  [day]: {
                                    ...currentDays[day],

                                    hours: currentDays[day].hours.filter(
                                      (_, hourIdx) => hourIdx !== idx,
                                    ),
                                  },
                                }));
                              }}
                            >
                              <Image
                                src={TrashIcon}
                                alt=""
                                width={22}
                                height={22}
                                aria-disabled="true"
                                loading="eager"
                              />
                            </button>
                          )}
                        </div>

                        {/* Title */}
                        <div className="flex flex-col gap-1 mb-3">
                          <label htmlFor={`${day}-title-${idx}`}>Title</label>

                          <input
                            className="bg-gray-50 rounded-lg border-[0.1rem] border-gray-300 px-3 py-1"
                            id={`${day}-title-${idx}`}
                            name={`${day}-title-${idx}`}
                            type="text"
                            value={hour.title}
                            onChange={(event) => {
                              setDays((currentDays) => ({
                                ...currentDays,

                                [day]: {
                                  ...currentDays[day],

                                  hours: currentDays[day].hours.map(
                                    (currentHour, hourIdx) =>
                                      hourIdx === idx
                                        ? {
                                            ...currentHour,
                                            title: event.target.value,
                                          }
                                        : currentHour,
                                  ),
                                },
                              }));
                            }}
                          />
                        </div>

                        {/* Note */}
                        <div className="flex flex-col gap-1 mb-3">
                          <label htmlFor={`${day}-note-${idx}`}>Note</label>

                          <textarea
                            className="bg-gray-50 rounded-lg border-[0.1rem] border-gray-300 px-3 py-1"
                            id={`${day}-note-${idx}`}
                            name={`${day}-note-${idx}`}
                            value={hour.note}
                            onChange={(event) => {
                              setDays((currentDays) => ({
                                ...currentDays,

                                [day]: {
                                  ...currentDays[day],

                                  hours: currentDays[day].hours.map(
                                    (currentHour, hourIdx) =>
                                      hourIdx === idx
                                        ? {
                                            ...currentHour,
                                            note: event.target.value,
                                          }
                                        : currentHour,
                                  ),
                                },
                              }));
                            }}
                          />
                        </div>

                        {/* Open */}
                        <div className="flex gap-2 mb-1">
                          <label htmlFor={`${day}-openTime-${idx}`}>Open</label>

                          <input
                            className="bg-gray-50 rounded-lg border-[0.1rem] border-gray-300 px-3 py-1"
                            id={`${day}-openTime-${idx}`}
                            name={`${day}-openTime-${idx}`}
                            type="time"
                            value={hour.openTime}
                            onChange={(event) => {
                              setDays((currentDays) => ({
                                ...currentDays,

                                [day]: {
                                  ...currentDays[day],

                                  hours: currentDays[day].hours.map(
                                    (currentHour, hourIdx) =>
                                      hourIdx === idx
                                        ? {
                                            ...currentHour,
                                            openTime: event.target.value,
                                          }
                                        : currentHour,
                                  ),
                                },
                              }));
                            }}
                          />
                        </div>

                        {/* Close */}
                        <div className="flex gap-2">
                          <label htmlFor={`${day}-closeTime-${idx}`}>
                            Close
                          </label>

                          <input
                            className="bg-gray-50 rounded-lg border-[0.1rem] border-gray-300 px-3 py-1"
                            id={`${day}-closeTime-${idx}`}
                            name={`${day}-closeTime-${idx}`}
                            type="time"
                            value={hour.closeTime}
                            onChange={(event) => {
                              setDays((currentDays) => ({
                                ...currentDays,

                                [day]: {
                                  ...currentDays[day],

                                  hours: currentDays[day].hours.map(
                                    (currentHour, hourIdx) =>
                                      hourIdx === idx
                                        ? {
                                            ...currentHour,
                                            closeTime: event.target.value,
                                          }
                                        : currentHour,
                                  ),
                                },
                              }));
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    className="w-full sm:w-[50%] sm:mx-auto md:w-fit md:ml-auto md:mr-0 border-[0.1rem] border-emerald-400 text-emerald-400 bg-neutral-50 rounded-lg px-3 py-1 mt-5"
                    type="button"
                    onClick={() => {
                      setDays((currentDays) => ({
                        ...currentDays,

                        [day]: {
                          ...currentDays[day],

                          hours: [
                            ...currentDays[day].hours,
                            {
                              title: "",
                              note: "",
                              openTime: "",
                              closeTime: "",
                            },
                          ],
                        },
                      }));
                    }}
                  >
                    Add Another
                  </button>
                </>
              )}
            </div>
          ))}
        </fieldset>
      )}

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
