"use client";

import ArrowIcon from "@/components/icons/arrow";
import TrashIcon from "@/components/icons/trash-red.svg";
import type { LocationJson } from "@/types/types";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { type SubmitEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import "../../../../page.css";
import CreateHoursForm from "@/components/ui/hours/CreateHoursForm";

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

export default function EditBusinessDaysPage() {
  const params = useParams<{ locationId: string }>();

  const locationId = params.locationId;

  const [locationData, setLocationData] = useState<LocationJson | null>(null);
  const [days, setDays] = useState<Record<DayOfWeek, DayHours> | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function getLocationData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const locationToast = toast.promise<LocationJson[]>(
          axios
            .get<{ locations: LocationJson[] }>("/api/business/locations")
            .then((response) => response.data.locations),
          {
            loading: "Loading business days...",
            success: "Business days loaded.",
            error: (error) => {
              if (axios.isAxiosError<{ error?: string }>(error)) {
                return {
                  message: "Failed to load business days.",
                  description:
                    error.response?.data?.error ??
                    `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error.",
                description:
                  "Something went wrong while loading the business days.",
              };
            },
          },
        );

        const locations = await locationToast.unwrap();

        const selectedLocation = locations.find(
          (location) => location.id === locationId,
        );

        if (!selectedLocation) {
          setErrorMessage("This location could not be found.");
          return;
        }

        if (!selectedLocation.days || selectedLocation.days.length === 0) {
          setErrorMessage(
            "Business days have not been activated for this location.",
          );

          return;
        }

        setLocationData(selectedLocation);

        const dayState = {} as Record<DayOfWeek, DayHours>;

        for (const dayName of MONDAY_SUNDAY) {
          const selectedDay = selectedLocation.days.find(
            (day) => day.dayOfWeek === dayName,
          );

          if (!selectedDay) {
            setErrorMessage(`${dayName} could not be found for this location.`);

            return;
          }

          dayState[dayName] = {
            id: selectedDay.id,
            isClosed: selectedDay.isClosed,
            originalIsClosed: selectedDay.isClosed,

            /*
             * Use the real hours returned from the API.
             *
             * If this day has no existing hours,
             * start it with one empty hours block.
             */
            hours:
              selectedDay.hours && selectedDay.hours.length > 0
                ? selectedDay.hours.map((hour) => ({
                    id: hour.id,

                    title: hour.title ?? "",

                    note: hour.note ?? "",

                    /*
                     * <input type="time"> expects
                     * an HH:mm string.
                     *
                     * 11:01 remains 11:01.
                     * If seconds ever come back,
                     * slice removes them.
                     */
                    openTime: hour.openTime.slice(0, 5),

                    closeTime: hour.closeTime.slice(0, 5),
                  }))
                : [
                    {
                      title: "",
                      note: "",
                      openTime: "",
                      closeTime: "",
                    },
                  ],
          };
        }

        setDays(dayState);
      } catch (error) {
        console.error("Error in Edit Business Days page:", error);

        if (axios.isAxiosError<{ error?: string }>(error)) {
          setErrorMessage(
            error.response?.data?.error ?? "Failed to load business days.",
          );
        } else {
          setErrorMessage("Failed to load business days.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    void getLocationData();
  }, [locationId]);

  /*
   * A valid form requires every day to either:
   *
   * 1. Be closed
   *
   * OR
   *
   * 2. Have at least one hours block where every
   *    block contains both open and close times.
   */
  const isValid =
    days !== null &&
    MONDAY_SUNDAY.every((day) => {
      const currentDay = days[day];

      if (currentDay.isClosed) {
        return true;
      }

      if (currentDay.hours.length === 0) {
        return false;
      }

      return currentDay.hours.every(
        (hour) => hour.openTime.trim() !== "" && hour.closeTime.trim() !== "",
      );
    });

  /*
   * Save should only be available when something
   * differs from the data originally loaded.
   */
  const hasChanges =
    days !== null &&
    MONDAY_SUNDAY.some((day) => {
      const currentDay = days[day];

      // Day open/closed status changed
      if (currentDay.isClosed !== currentDay.originalIsClosed) {
        return true;
      }

      return currentDay.hours.some((hour) => {
        /*
         * No id means this hour does not exist in the database.
         * Only count it as new if the user actually entered something.
         */
        if (!hour.id) {
          return (
            hour.openTime.trim() !== "" ||
            hour.closeTime.trim() !== "" ||
            hour.title.trim() !== "" ||
            hour.note.trim() !== ""
          );
        }

        const originalDay = locationData?.days.find(
          (locationDay) => locationDay.id === currentDay.id,
        );

        const originalHour = originalDay?.hours?.find(
          (locationHour) => locationHour.id === hour.id,
        );

        if (!originalHour) {
          return false;
        }

        return (
          hour.openTime !== originalHour.openTime.slice(0, 5) ||
          hour.closeTime !== originalHour.closeTime.slice(0, 5) ||
          hour.title !== (originalHour.title ?? "") ||
          hour.note !== (originalHour.note ?? "")
        );
      });
    });

  const canSubmit = isValid && hasChanges && !isSaving;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!days || !canSubmit) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updateToast = toast.promise(
        async () => {
          for (const day of MONDAY_SUNDAY) {
            const currentDay = days[day];

            /*
             * Only update the LocationDay when
             * isClosed was actually changed.
             */
            if (currentDay.isClosed !== currentDay.originalIsClosed) {
              await axios.patch(
                `/api/admin/locations/${locationId}/days/${currentDay.id}`,
                {
                  isClosed: currentDay.isClosed,
                },
              );
            }

            /*
             * Closed days don't need hour
             * changes submitted.
             */
            if (currentDay.isClosed) {
              continue;
            }

            for (const hour of currentDay.hours) {
              const requestBody = {
                openTime: hour.openTime,
                closeTime: hour.closeTime,

                title: hour.title.trim() || null,

                note: hour.note.trim() || null,
              };

              /*
               * Existing hour:
               * only PATCH if something changed.
               */
              if (hour.id) {
                const originalDay = locationData?.days.find(
                  (locationDay) => locationDay.id === currentDay.id,
                );

                const originalHour = originalDay?.hours?.find(
                  (locationHour) => locationHour.id === hour.id,
                );

                const hourChanged =
                  originalHour &&
                  (hour.openTime !== originalHour.openTime.slice(0, 5) ||
                    hour.closeTime !== originalHour.closeTime.slice(0, 5) ||
                    hour.title !== (originalHour.title ?? "") ||
                    hour.note !== (originalHour.note ?? ""));

                if (!hourChanged) {
                  continue;
                }

                await axios.patch(
                  `/api/admin/locations/${locationId}/days/${currentDay.id}/hours/${hour.id}`,
                  requestBody,
                );

                continue;
              }

              /*
               * No id means this was created
               * locally with "Add Another".
               */
              await axios.post(
                `/api/admin/locations/${locationId}/days/${currentDay.id}/hours`,
                requestBody,
              );
            }
          }
        },
        {
          loading: "Updating business schedule...",

          success: "Business schedule updated.",

          error: (error) => {
            if (
              axios.isAxiosError<{
                error?: string;
              }>(error)
            ) {
              return {
                message: "Failed to update business schedule.",

                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",

              description:
                "Something went wrong while updating the business schedule.",
            };
          },
        },
      );

      await updateToast.unwrap();

      /*
       * Reload the page so the newly-saved database
       * values become the new original state.
       */
      window.location.reload();
    } catch (error) {
      console.error("Error in Edit Business Days page:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ??
            "Failed to update the business schedule.",
        );
      } else {
        setErrorMessage("Failed to update the business schedule.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function removeHour(day: DayOfWeek, hourIdx: number) {
    if (!days) return;

    const currentDay = days[day];
    const hour = currentDay.hours[hourIdx];

    try {
      /*
       * If this hour already exists in the database,
       * delete the actual Hour record first.
       */
      if (hour.id) {
        const deleteToast = toast.promise(
          axios
            .delete(
              `/api/admin/locations/${locationId}/days/${currentDay.id}/hours/${hour.id}`,
            )
            .then((response) => response.data),
          {
            loading: "Removing hours...",
            success: "Hours removed.",
            error: (error) => {
              if (
                axios.isAxiosError<{
                  error?: string;
                }>(error)
              ) {
                return {
                  message: "Failed to remove hours.",
                  description:
                    error.response?.data?.error ??
                    `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error.",
                description: "Something went wrong while removing the hours.",
              };
            },
          },
        );

        await deleteToast.unwrap();
      }

      /*
       * Remove the hour from the UI.
       *
       * If there was no hour.id, it was never saved,
       * so this is the only thing that needs to happen.
       */
      setDays((currentDays) => {
        if (!currentDays) {
          return currentDays;
        }

        return {
          ...currentDays,

          [day]: {
            ...currentDays[day],

            hours: currentDays[day].hours.filter((_, idx) => idx !== hourIdx),
          },
        };
      });
    } catch (error) {
      console.error("Error removing location hours:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to remove the hours.",
        );
      } else {
        setErrorMessage("Failed to remove the hours.");
      }
    }
  }

  if (isLoading) {
    return <p>Loading business days...</p>;
  }

  if (errorMessage && (!locationData || !days)) {
    return <p role="alert">{errorMessage}</p>;
  }

  if (!locationData || !days) {
    return <p>Business days could not be found.</p>;
  }

  return (
    <section aria-labelledby="business-days-heading">
      {/* HEADER */}
      <header className="flex items-center gap-3">
        <Link
          href={`/dashboard/locations/${locationId}`}
          aria-label="Return to location"
        >
          <ArrowIcon direction="left" size={50} />
        </Link>

        <h1 className="truncate" id="business-days-heading">
          Edit Business Days
        </h1>
      </header>

      <div className="mt-[1.5rem]">
        <form
          className="dashboard-card flex flex-col gap-5"
          onSubmit={handleSubmit}
        >
          <fieldset>
            <legend>Business Schedule</legend>

            <p>
              Each open day must include business hours. Mark a day as closed if
              this location does not operate on that day.
            </p>

            <div className="flex flex-col gap-5 mt-5">
              {MONDAY_SUNDAY.map((day) => {
                const currentDay = days[day];

                return (
                  <div
                    key={currentDay.id}
                    className="dashboard-card !bg-neutral-100 flex flex-col"
                  >
                    {/* DAY HEADER */}
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
                          checked={currentDay.isClosed}
                          onChange={(event) => {
                            setDays((currentDays) => {
                              if (!currentDays) {
                                return currentDays;
                              }

                              return {
                                ...currentDays,

                                [day]: {
                                  ...currentDays[day],

                                  isClosed: event.target.checked,
                                },
                              };
                            });
                          }}
                        />
                        Closed
                      </label>
                    </div>

                    {/* HOURS */}
                    <CreateHoursForm
                      day={day}
                      currentDay={currentDay}
                      setDays={setDays}
                      removeHour={removeHour}
                    />
                  </div>
                );
              })}
            </div>
          </fieldset>

          {errorMessage && (
            <p role="alert" className="text-red-500">
              {errorMessage}
            </p>
          )}

          <button
            className="w-full sm:w-[50%] sm:mx-auto md:w-fit md:mr-auto md:ml-0 bg-emerald-300 border-[0.1rem] border-green-500 rounded-lg text-green-900 px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={!canSubmit}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </section>
  );
}
