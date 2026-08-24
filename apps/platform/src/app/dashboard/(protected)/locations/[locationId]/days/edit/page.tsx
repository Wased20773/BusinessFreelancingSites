"use client";

import ArrowIcon from "@/components/icons/arrow";
import type { LocationJson } from "@/types/types";
import axios from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import { type SubmitEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import "../../../../page.css";

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

  hour: Hour | null;
  specialHours: Hour[];
};

const EMPTY_HOUR: Hour = {
  openTime: "",
  closeTime: "",
  title: "",
  note: "",
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

        /*
         * Days are already returned from the API
         * in Monday -> Sunday order.
         */
        for (const selectedDay of selectedLocation.days) {
          const dayName = selectedDay.dayOfWeek as DayOfWeek;

          dayState[dayName] = {
            id: selectedDay.id,

            isClosed: selectedDay.isClosed,
            originalIsClosed: selectedDay.isClosed,

            /*
             * A day can only contain one regular
             * opening and closing time.
             */
            hour: selectedDay.hour
              ? {
                  id: selectedDay.hour.id,
                  openTime: selectedDay.hour.openTime,
                  closeTime: selectedDay.hour.closeTime,
                  title: selectedDay.hour.title ?? "",
                  note: selectedDay.hour.note ?? "",
                }
              : null,

            /*
             * Special hours may contain multiple
             * Hour records for the same day.
             */
            specialHours: (selectedDay.specialHours ?? []).map((hour) => ({
              id: hour.id,
              openTime: hour.openTime,
              closeTime: hour.closeTime,
              title: hour.title ?? "",
              note: hour.note ?? "",
            })),
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
   * Checks whether two time ranges overlap.
   */
  function timesOverlap(
    firstOpenTime: string,
    firstCloseTime: string,
    secondOpenTime: string,
    secondCloseTime: string,
  ) {
    return firstOpenTime < secondCloseTime && firstCloseTime > secondOpenTime;
  }

  /*
   * Every day must either:
   *
   * 1. Be closed
   *
   * OR
   *
   * 2. Have a valid regular hour if one is entered,
   *    and every special hour must contain both
   *    an opening and closing time.
   */
  const isValid =
    days !== null &&
    MONDAY_SUNDAY.every((day) => {
      const currentDay = days[day];

      if (currentDay.isClosed) {
        return true;
      }

      /*
       * Validate regular hours.
       */
      if (currentDay.hour) {
        const hasOpenTime = currentDay.hour.openTime.trim() !== "";
        const hasCloseTime = currentDay.hour.closeTime.trim() !== "";

        if (hasOpenTime !== hasCloseTime) {
          return false;
        }

        if (
          hasOpenTime &&
          hasCloseTime &&
          currentDay.hour.openTime >= currentDay.hour.closeTime
        ) {
          return false;
        }
      }

      /*
       * Validate special hours.
       */
      for (const specialHour of currentDay.specialHours) {
        const hasOpenTime = specialHour.openTime.trim() !== "";
        const hasCloseTime = specialHour.closeTime.trim() !== "";

        /*
         * Completely empty unsaved special hour
         * is allowed until the user enters something.
         */
        if (!hasOpenTime && !hasCloseTime) {
          continue;
        }

        if (!hasOpenTime || !hasCloseTime) {
          return false;
        }

        if (specialHour.openTime >= specialHour.closeTime) {
          return false;
        }
      }

      /*
       * Prevent special hours from overlapping
       * with each other.
       */
      for (let i = 0; i < currentDay.specialHours.length; i++) {
        const firstHour = currentDay.specialHours[i];

        if (!firstHour.openTime || !firstHour.closeTime) {
          continue;
        }

        for (let j = i + 1; j < currentDay.specialHours.length; j++) {
          const secondHour = currentDay.specialHours[j];

          if (!secondHour.openTime || !secondHour.closeTime) {
            continue;
          }

          if (
            timesOverlap(
              firstHour.openTime,
              firstHour.closeTime,
              secondHour.openTime,
              secondHour.closeTime,
            )
          ) {
            return false;
          }
        }
      }

      return true;
    });

  /*
   * Save should only be available when something
   * differs from the data originally loaded.
   */
  const hasChanges =
    days !== null &&
    MONDAY_SUNDAY.some((day) => {
      const currentDay = days[day];

      const originalDay = locationData?.days.find(
        (locationDay) => locationDay.id === currentDay.id,
      );

      if (!originalDay) {
        return false;
      }

      /*
       * Day open/closed status changed.
       */
      if (currentDay.isClosed !== currentDay.originalIsClosed) {
        return true;
      }

      /*
       * Regular hours changed.
       */
      if (!currentDay.hour && originalDay.hour) {
        return true;
      }

      if (currentDay.hour && !originalDay.hour) {
        return (
          currentDay.hour.openTime.trim() !== "" ||
          currentDay.hour.closeTime.trim() !== ""
        );
      }

      if (currentDay.hour && originalDay.hour) {
        if (
          currentDay.hour.openTime !== originalDay.hour.openTime ||
          currentDay.hour.closeTime !== originalDay.hour.closeTime
        ) {
          return true;
        }
      }

      /*
       * Special hours were removed.
       */
      if (
        currentDay.specialHours.filter((hour) => hour.id).length !==
        (originalDay.specialHours ?? []).length
      ) {
        return true;
      }

      /*
       * Special hours were created or edited.
       */
      return currentDay.specialHours.some((hour) => {
        if (!hour.id) {
          return (
            hour.openTime.trim() !== "" ||
            hour.closeTime.trim() !== "" ||
            hour.title.trim() !== "" ||
            hour.note.trim() !== ""
          );
        }

        const originalHour = originalDay.specialHours?.find(
          (specialHour) => specialHour.id === hour.id,
        );

        if (!originalHour) {
          return false;
        }

        return (
          hour.openTime !== originalHour.openTime ||
          hour.closeTime !== originalHour.closeTime ||
          hour.title !== (originalHour.title ?? "") ||
          hour.note !== (originalHour.note ?? "")
        );
      });
    });

  const canSubmit = isValid && hasChanges && !isSaving;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!days || !canSubmit) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updateToast = toast.promise(
        async () => {
          for (const day of MONDAY_SUNDAY) {
            const currentDay = days[day];

            const originalDay = locationData?.days.find(
              (locationDay) => locationDay.id === currentDay.id,
            );

            if (!originalDay) {
              continue;
            }

            /*
             * Only update LocationDay when
             * isClosed actually changed.
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
             * Closed days don't need hours submitted.
             */
            if (currentDay.isClosed) {
              continue;
            }

            // ############################
            // ##### REGULAR HOURS ########
            // ############################

            if (currentDay.hour) {
              const hasRegularHour =
                currentDay.hour.openTime.trim() !== "" ||
                currentDay.hour.closeTime.trim() !== "";

              /*
               * Existing regular hour.
               */
              if (currentDay.hour.id && originalDay.hour) {
                const hourChanged =
                  currentDay.hour.openTime !== originalDay.hour.openTime ||
                  currentDay.hour.closeTime !== originalDay.hour.closeTime;

                if (hourChanged) {
                  await axios.patch(
                    `/api/admin/locations/${locationId}/days/${currentDay.id}/hours/${currentDay.hour.id}`,
                    {
                      openTime: currentDay.hour.openTime,
                      closeTime: currentDay.hour.closeTime,
                    },
                  );
                }
              } else if (hasRegularHour) {
                /*
                 * New regular hour.
                 */
                await axios.post(
                  `/api/admin/locations/${locationId}/days/${currentDay.id}/hours`,
                  {
                    openTime: currentDay.hour.openTime,
                    closeTime: currentDay.hour.closeTime,
                    isSpecial: false,
                  },
                );
              }
            }

            // ############################
            // ##### SPECIAL HOURS ########
            // ############################

            for (const specialHour of currentDay.specialHours) {
              const hasSpecialHour =
                specialHour.openTime.trim() !== "" ||
                specialHour.closeTime.trim() !== "" ||
                specialHour.title.trim() !== "" ||
                specialHour.note.trim() !== "";

              /*
               * Ignore completely empty locally-created rows.
               */
              if (!specialHour.id && !hasSpecialHour) {
                continue;
              }

              const requestBody = {
                openTime: specialHour.openTime,
                closeTime: specialHour.closeTime,
                title: specialHour.title.trim() || null,
                note: specialHour.note.trim() || null,
              };

              /*
               * Existing special hour.
               */
              if (specialHour.id) {
                const originalHour = originalDay.specialHours?.find(
                  (hour) => hour.id === specialHour.id,
                );

                const hourChanged =
                  originalHour &&
                  (specialHour.openTime !== originalHour.openTime ||
                    specialHour.closeTime !== originalHour.closeTime ||
                    specialHour.title !== (originalHour.title ?? "") ||
                    specialHour.note !== (originalHour.note ?? ""));

                if (!hourChanged) {
                  continue;
                }

                await axios.patch(
                  `/api/admin/locations/${locationId}/days/${currentDay.id}/hours/${specialHour.id}`,
                  requestBody,
                );

                continue;
              }

              /*
               * New special hour.
               */
              await axios.post(
                `/api/admin/locations/${locationId}/days/${currentDay.id}/hours`,
                {
                  ...requestBody,
                  isSpecial: true,
                },
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
       * Reload so saved database values become
       * the new original state.
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

  function updateRegularHour(
    day: DayOfWeek,
    field: "openTime" | "closeTime",
    value: string,
  ) {
    setDays((currentDays) => {
      if (!currentDays) {
        return currentDays;
      }

      const currentHour = currentDays[day].hour ?? {
        ...EMPTY_HOUR,
      };

      return {
        ...currentDays,

        [day]: {
          ...currentDays[day],

          hour: {
            ...currentHour,
            [field]: value,
          },
        },
      };
    });
  }

  function addSpecialHour(day: DayOfWeek) {
    setDays((currentDays) => {
      if (!currentDays) {
        return currentDays;
      }

      return {
        ...currentDays,

        [day]: {
          ...currentDays[day],

          specialHours: [
            ...currentDays[day].specialHours,
            {
              ...EMPTY_HOUR,
            },
          ],
        },
      };
    });
  }

  function updateSpecialHour(
    day: DayOfWeek,
    hourIdx: number,
    field: keyof Omit<Hour, "id">,
    value: string,
  ) {
    setDays((currentDays) => {
      if (!currentDays) {
        return currentDays;
      }

      const specialHours = [...currentDays[day].specialHours];

      specialHours[hourIdx] = {
        ...specialHours[hourIdx],
        [field]: value,
      };

      return {
        ...currentDays,

        [day]: {
          ...currentDays[day],
          specialHours,
        },
      };
    });
  }

  async function removeSpecialHour(day: DayOfWeek, hourIdx: number) {
    if (!days) {
      return;
    }

    const currentDay = days[day];
    const specialHour = currentDay.specialHours[hourIdx];

    try {
      /*
       * Persisted special hour must first
       * be deleted from the database.
       */
      if (specialHour.id) {
        const deleteToast = toast.promise(
          axios
            .delete(
              `/api/admin/locations/${locationId}/days/${currentDay.id}/hours/${specialHour.id}`,
            )
            .then((response) => response.data),
          {
            loading: "Removing special hours...",

            success: "Special hours removed.",

            error: (error) => {
              if (axios.isAxiosError<{ error?: string }>(error)) {
                return {
                  message: "Failed to remove special hours.",

                  description:
                    error.response?.data?.error ??
                    `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error.",

                description:
                  "Something went wrong while removing the special hours.",
              };
            },
          },
        );

        await deleteToast.unwrap();
      }

      /*
       * Unsaved special hours only need
       * to be removed from local state.
       */
      setDays((currentDays) => {
        if (!currentDays) {
          return currentDays;
        }

        return {
          ...currentDays,

          [day]: {
            ...currentDays[day],

            specialHours: currentDays[day].specialHours.filter(
              (_, idx) => idx !== hourIdx,
            ),
          },
        };
      });
    } catch (error) {
      console.error("Error removing special hours:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to remove special hours.",
        );
      } else {
        setErrorMessage("Failed to remove special hours.");
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
              Set the regular opening and closing time for each day. Special
              hours can be added separately when this location operates outside
              of its normal schedule.
            </p>

            <div className="flex flex-col gap-5 mt-5">
              {locationData.days.map((locationDay) => {
                const day = locationDay.dayOfWeek as DayOfWeek;
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

                    {!currentDay.isClosed && (
                      <>
                        {/* ######################## */}
                        {/* ##### REGULAR HOURS #### */}
                        {/* ######################## */}

                        <div>
                          <p className="font-semibold">Regular Hours</p>

                          <p className="text-sm text-gray-500 mb-3">
                            Set the normal opening and closing time for this
                            day.
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label
                                htmlFor={`${day}-openTime`}
                                className="font-semibold"
                              >
                                Open
                              </label>

                              <input
                                id={`${day}-openTime`}
                                type="time"
                                className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 mt-1"
                                value={currentDay.hour?.openTime ?? ""}
                                onChange={(event) =>
                                  updateRegularHour(
                                    day,
                                    "openTime",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`${day}-closeTime`}
                                className="font-semibold"
                              >
                                Close
                              </label>

                              <input
                                id={`${day}-closeTime`}
                                type="time"
                                className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 mt-1"
                                value={currentDay.hour?.closeTime ?? ""}
                                onChange={(event) =>
                                  updateRegularHour(
                                    day,
                                    "closeTime",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>

                        {/* ######################## */}
                        {/* ##### SPECIAL HOURS #### */}
                        {/* ######################## */}

                        <div className="border-t border-gray-300 mt-5 pt-5">
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <p className="font-semibold">Special Hours</p>

                              <p className="text-sm text-gray-500">
                                Add temporary or alternate operating hours for
                                this day.
                              </p>
                            </div>

                            <button
                              type="button"
                              className="border-[0.1rem] border-blue-400 rounded-lg px-3 py-1"
                              onClick={() => addSpecialHour(day)}
                            >
                              Add Another
                            </button>
                          </div>

                          {currentDay.specialHours.length > 0 && (
                            <div className="flex flex-col gap-4 mt-4">
                              {currentDay.specialHours.map(
                                (specialHour, hourIdx) => (
                                  <div
                                    key={specialHour.id ?? hourIdx}
                                    className="border-[0.1rem] border-gray-300 rounded-lg p-3"
                                  >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div>
                                        <label
                                          htmlFor={`${day}-${hourIdx}-special-openTime`}
                                          className="font-semibold"
                                        >
                                          Open
                                        </label>

                                        <input
                                          id={`${day}-${hourIdx}-special-openTime`}
                                          type="time"
                                          className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 mt-1"
                                          value={specialHour.openTime}
                                          onChange={(event) =>
                                            updateSpecialHour(
                                              day,
                                              hourIdx,
                                              "openTime",
                                              event.target.value,
                                            )
                                          }
                                        />
                                      </div>

                                      <div>
                                        <label
                                          htmlFor={`${day}-${hourIdx}-special-closeTime`}
                                          className="font-semibold"
                                        >
                                          Close
                                        </label>

                                        <input
                                          id={`${day}-${hourIdx}-special-closeTime`}
                                          type="time"
                                          className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 mt-1"
                                          value={specialHour.closeTime}
                                          onChange={(event) =>
                                            updateSpecialHour(
                                              day,
                                              hourIdx,
                                              "closeTime",
                                              event.target.value,
                                            )
                                          }
                                        />
                                      </div>
                                    </div>

                                    <div className="mt-3">
                                      <label
                                        htmlFor={`${day}-${hourIdx}-special-title`}
                                        className="font-semibold"
                                      >
                                        Title
                                      </label>

                                      <input
                                        id={`${day}-${hourIdx}-special-title`}
                                        type="text"
                                        className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 mt-1"
                                        value={specialHour.title}
                                        onChange={(event) =>
                                          updateSpecialHour(
                                            day,
                                            hourIdx,
                                            "title",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </div>

                                    <div className="mt-3">
                                      <label
                                        htmlFor={`${day}-${hourIdx}-special-note`}
                                        className="font-semibold"
                                      >
                                        Note
                                      </label>

                                      <textarea
                                        id={`${day}-${hourIdx}-special-note`}
                                        className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 mt-1"
                                        value={specialHour.note}
                                        onChange={(event) =>
                                          updateSpecialHour(
                                            day,
                                            hourIdx,
                                            "note",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </div>

                                    <button
                                      type="button"
                                      className="mt-3 text-red-500"
                                      onClick={() =>
                                        void removeSpecialHour(day, hourIdx)
                                      }
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
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
            className="w-full md:w-fit bg-emerald-300 border-[0.1rem] border-green-500 rounded-lg text-green-900 px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
