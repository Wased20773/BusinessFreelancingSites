"use client";

import TrashIcon from "@/components/icons/trash-red.svg";
import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";

const MONDAY_SUNDAY = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type DayOfWeek = (typeof MONDAY_SUNDAY)[number];

type Hour = {
  id?: string;
  openTime: string;
  closeTime: string;
  title: string;
  note: string;
};

type DayHours = {
  id: string;
  isClosed: boolean;
  originalIsClosed: boolean;
  hours: Hour[];
};

type CreateHoursFormProps = {
  day: DayOfWeek;
  currentDay: DayHours;
  setDays: Dispatch<SetStateAction<Record<DayOfWeek, DayHours> | null>>;
  removeHour: (day: DayOfWeek, hourIdx: number) => Promise<void>;
};

export default function CreateHoursForm({
  day,
  currentDay,
  setDays,
  removeHour,
}: CreateHoursFormProps) {
  if (currentDay.isClosed) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {currentDay.hours.map((hour, idx) => (
          <div key={hour.id ?? idx}>
            {/* HOURS HEADER */}
            <div className="flex justify-between items-center mb-2">
              <p>Hours {idx + 1}</p>

              <button
                className="border-[0.1rem] border-red-300 rounded-lg p-1"
                type="button"
                aria-label={`Remove hours ${idx + 1} from ${day}`}
                onClick={() => {
                  void removeHour(day, idx);
                }}
              >
                <Image
                  src={TrashIcon}
                  alt=""
                  aria-hidden="true"
                  width={22}
                  height={22}
                  loading="eager"
                />
              </button>
            </div>

            {/* TITLE */}
            <div className="flex flex-col gap-1 mb-3">
              <label htmlFor={`${day}-title-${idx}`}>Title</label>

              <input
                className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                id={`${day}-title-${idx}`}
                name={`${day}-title-${idx}`}
                type="text"
                value={hour.title}
                onChange={(event) => {
                  setDays((currentDays) => {
                    if (!currentDays) {
                      return currentDays;
                    }

                    return {
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
                    };
                  });
                }}
              />
            </div>

            {/* NOTE */}
            <div className="flex flex-col gap-1 mb-3">
              <label htmlFor={`${day}-note-${idx}`}>Note</label>

              <textarea
                className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                id={`${day}-note-${idx}`}
                name={`${day}-note-${idx}`}
                value={hour.note}
                onChange={(event) => {
                  setDays((currentDays) => {
                    if (!currentDays) {
                      return currentDays;
                    }

                    return {
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
                    };
                  });
                }}
              />
            </div>

            {/* OPEN */}
            <div className="flex items-center gap-2 mb-1">
              <label htmlFor={`${day}-openTime-${idx}`}>Open</label>

              <input
                className="block border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                id={`${day}-openTime-${idx}`}
                name={`${day}-openTime-${idx}`}
                type="time"
                value={hour.openTime}
                onChange={(event) => {
                  setDays((currentDays) => {
                    if (!currentDays) {
                      return currentDays;
                    }

                    return {
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
                    };
                  });
                }}
              />
            </div>

            {/* CLOSE */}
            <div className="flex items-center gap-2">
              <label htmlFor={`${day}-closeTime-${idx}`}>Close</label>

              <input
                className="block border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                id={`${day}-closeTime-${idx}`}
                name={`${day}-closeTime-${idx}`}
                type="time"
                value={hour.closeTime}
                onChange={(event) => {
                  setDays((currentDays) => {
                    if (!currentDays) {
                      return currentDays;
                    }

                    return {
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
                    };
                  });
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ADD HOURS */}
      <button
        className="w-full sm:w-[50%] sm:mx-auto md:w-fit md:ml-auto md:mr-0 border-[0.1rem] border-emerald-400 text-emerald-400 bg-neutral-50 rounded-lg px-3 py-1 mt-5"
        type="button"
        onClick={() => {
          setDays((currentDays) => {
            if (!currentDays) {
              return currentDays;
            }

            return {
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
            };
          });
        }}
      >
        Add Another
      </button>
    </>
  );
}
