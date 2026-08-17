"use client";

import CalendarIcon from "@/components/icons/calendar.svg";
import EditIcon from "@/components/icons/edit.svg";
import type { LocationJson } from "@/types/types";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

const MONDAY_SUNDAY = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type CreateDaysResponse = {
  message: string;
  count: number;
};

type CreateDaysFormProps = {
  locationId: string;
  locationData: LocationJson;
  getLocationData: (showLoading?: boolean) => Promise<void>;
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
  handleRemoveBusinessDays: () => Promise<void>;
};

export default function CreateDaysForm({
  locationId,
  locationData,
  getLocationData,
  setErrorMessage,
  handleRemoveBusinessDays,
}: CreateDaysFormProps) {
  const [isActivatingDays, setIsActivatingDays] = useState<boolean>(false);

  const hasBusinessDays = locationData.days.length > 0;

  async function activateBusinessDays() {
    setIsActivatingDays(true);
    setErrorMessage(null);

    const requestBody = {
      days: MONDAY_SUNDAY.map((day) => ({
        dayOfWeek: day,
        isClosed: day === "Saturday" || day === "Sunday",
      })),
    };

    try {
      const daysToast = toast.promise<CreateDaysResponse>(
        axios
          .post<CreateDaysResponse>(
            `/api/admin/locations/${locationId}/days`,
            requestBody,
          )
          .then((response) => response.data),
        {
          loading: "Activating business days...",
          success: "Business days activated.",
          error: (error) => {
            if (
              axios.isAxiosError<{
                error?: string;
              }>(error)
            ) {
              return {
                message: "Failed to activate business days.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description:
                "Something went wrong while activating business days.",
            };
          },
        },
      );

      await daysToast.unwrap();

      // Refresh so we receive the real
      // LocationDay records and ids.
      await getLocationData(false);
    } catch (error) {
      console.error("Error activating Business Days:", error);

      if (
        axios.isAxiosError<{
          error?: string;
        }>(error)
      ) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to activate business days.",
        );
      } else {
        setErrorMessage("Failed to activate business days.");
      }
    } finally {
      setIsActivatingDays(false);
    }
  }

  return (
    <section
      className="dashboard-card p-4"
      aria-labelledby="business-days-heading"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Image
            src={CalendarIcon}
            alt=""
            aria-hidden="true"
            width={35}
            height={35}
          />

          <h2 id="business-days-heading">Business Days</h2>
        </div>

        {hasBusinessDays && (
          <Link
            href={`${locationId}/days/edit`}
            className="shrink-0"
            aria-label="Edit business days"
          >
            <Image
              src={EditIcon}
              alt=""
              aria-hidden="true"
              className="md:min-w-[30px] min-w-[50px] h-fit"
            />
          </Link>
        )}
      </div>

      {!hasBusinessDays ? (
        <div className="mt-3">
          <p>
            Business days have not been activated for this location. Activating
            business days will allow you to manage which days this location is
            open or closed.
          </p>

          <button
            className="w-full sm:w-[50%] sm:mx-auto md:w-fit md:ml-auto md:mr-0 block bg-emerald-300 border-[0.1rem] border-green-500 rounded-lg text-green-900 px-3 py-1 mt-5 disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            disabled={isActivatingDays}
            onClick={activateBusinessDays}
          >
            {isActivatingDays ? "Activating..." : "Activate Business Days"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p>Manage which days this location is open or closed.</p>

          <div className="flex flex-col">
            {locationData.days.map((day) => (
              <div
                key={day.id}
                className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0"
              >
                <p className="font-semibold">{day.dayOfWeek}</p>

                <p>{day.isClosed ? "Closed" : "Open"}</p>
              </div>
            ))}
          </div>

          <button
            className="w-fit bg-red-200 border-[0.1rem] border-red-500 rounded-md px-2 py-1 text-red-500"
            type="button"
            onClick={handleRemoveBusinessDays}
          >
            Remove Business Days
          </button>
        </div>
      )}
    </section>
  );
}
