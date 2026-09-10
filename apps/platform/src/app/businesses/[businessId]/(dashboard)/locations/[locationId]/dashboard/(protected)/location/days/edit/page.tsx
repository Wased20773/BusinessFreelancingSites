"use client";

import { ACCESS_LEVEL, type LocationJson } from "@/types/types";
import axios from "axios";
import { useParams } from "next/navigation";
import { type SubmitEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import "../../../page.css";
import { useSession } from "next-auth/react";
import PageState from "@/components/ui/PageState";
import BusinessDaysForm from "@/components/ui/days/BusinessDaysForm";
import PageHeading from "@/components/ui/PageHeader";

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
  const params = useParams<{
    businessId: string;
    locationId: string;
  }>();

  const businessId = params.businessId;
  const locationId = params.locationId;

  const [locationData, setLocationData] = useState<LocationJson | null>(null);
  const [days, setDays] = useState<Record<DayOfWeek, DayHours> | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // When enabled, changed days and hours will also be updated
  // across their currently synchronized copies.
  const [applyToSynced, setApplyToSynced] = useState<boolean>(true);

  const { data: session, status } = useSession();

  const currentAccessLevel = session?.user?.accessLevel;

  const canManageBusinessDays =
    currentAccessLevel === ACCESS_LEVEL.owner ||
    currentAccessLevel === ACCESS_LEVEL.admin;

  const canViewBusinessDays =
    canManageBusinessDays || currentAccessLevel === ACCESS_LEVEL.staff;

  const isDeveloper = currentAccessLevel === ACCESS_LEVEL.developer;

  useEffect(() => {
    async function getLocationData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const locationToast = toast.promise<LocationJson>(
          axios
            .get<LocationJson>(
              `/api/business/locations/${locationId}/schedule`,
              {
                headers: {
                  "x-business-id": businessId,
                  "x-location-id": locationId,
                },
              },
            )
            .then((response) => response.data),
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

        const selectedLocation = await locationToast.unwrap();

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

    if (status === "authenticated" && canViewBusinessDays) {
      void getLocationData();
    }
  }, [businessId, locationId, status, canViewBusinessDays]);

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
                `/api/businesses/${businessId}/locations/${locationId}/days/${currentDay.id}`,
                {
                  isClosed: currentDay.isClosed,
                  isSynced: applyToSynced,
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
                    `/api/businesses/${businessId}/locations/${locationId}/days/${currentDay.id}/hours/${currentDay.hour.id}`,
                    {
                      openTime: currentDay.hour.openTime,
                      closeTime: currentDay.hour.closeTime,
                      isSynced: applyToSynced,
                    },
                  );
                }
              } else if (hasRegularHour) {
                /*
                 * New regular hour.
                 */
                await axios.post(
                  `/api/businesses/${businessId}/locations/${locationId}/days/${currentDay.id}/hours`,
                  {
                    openTime: currentDay.hour.openTime,
                    closeTime: currentDay.hour.closeTime,
                    isSpecial: false,
                    isSynced: applyToSynced,
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
                isSynced: applyToSynced,
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
                  `/api/businesses/${businessId}/locations/${locationId}/days/${currentDay.id}/hours/${specialHour.id}`,
                  requestBody,
                );

                continue;
              }

              /*
               * New special hour.
               */
              await axios.post(
                `/api/businesses/${businessId}/locations/${locationId}/days/${currentDay.id}/hours`,
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
              `/api/businesses/${businessId}/locations/${locationId}/days/${currentDay.id}/hours/${specialHour.id}`,
              {
                data: {
                  deleteAllSynced: applyToSynced,
                },
              },
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

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper,
    canView: canViewBusinessDays,
    pageTitle: "Location",
    reason:
      "Your current access level does not allow business schedule management.",
  });

  if (pageState) {
    return pageState;
  }

  if (errorMessage && (!locationData || !days)) {
    return (
      <p role="alert" className="p-5">
        {errorMessage}
      </p>
    );
  }

  if (!locationData || !days) {
    return <p className="p-5">Business days could not be found.</p>;
  }

  return (
    <section
      aria-labelledby="business-days-heading"
      className="max-w-[1000px] mx-auto p-5 pt-0"
    >
      {/* HEADER */}
      <PageHeading
        path={`/businesses/${businessId}/locations/${locationId}/dashboard/location`}
        ariaLabel="Return to location"
        setIsLoading={setIsLoading}
        headingId="business-days-heading"
        heading={canManageBusinessDays ? "Edit Business Days" : "Business Days"}
      />

      <div className="mt-[0.5rem]">
        <BusinessDaysForm
          locationData={locationData}
          days={days}
          canManage={canManageBusinessDays}
          isSaving={isSaving}
          canSubmit={canSubmit}
          errorMessage={errorMessage}
          applyToSynced={applyToSynced}
          setApplyToSynced={setApplyToSynced}
          setDays={setDays}
          handleSubmit={handleSubmit}
          updateRegularHour={updateRegularHour}
          addSpecialHour={addSpecialHour}
          updateSpecialHour={updateSpecialHour}
          removeSpecialHour={removeSpecialHour}
        />
      </div>
    </section>
  );
}
