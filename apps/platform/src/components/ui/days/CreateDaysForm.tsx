"use client";

import CalendarIcon from "@/components/icons/calendar.svg";
import EditIcon from "@/components/icons/edit.svg";
import type { LocationJson } from "@/types/types";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type CreateDaysFormProps = {
  locationData: LocationJson;
  hasMultipleLocations: boolean;
  isActivatingDays: boolean;
  isDeleting: boolean;
  activateBusinessDays: (isSynced: boolean) => Promise<void>;
  handleRemoveBusinessDays: () => Promise<void>;
};

export default function CreateDaysForm({
  locationData,
  hasMultipleLocations,
  isActivatingDays,
  isDeleting,
  activateBusinessDays,
  handleRemoveBusinessDays,
}: CreateDaysFormProps) {
  const [syncBusinessDays, setSyncBusinessDays] = useState<boolean>(false);

  const hasBusinessDays = locationData.days.length > 0;

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
            href={"location/days/edit"}
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

          {hasMultipleLocations && (
            <label
              htmlFor="sync-business-days"
              className="flex items-start gap-2 cursor-pointer mt-4"
            >
              <input
                id="sync-business-days"
                name="sync-business-days"
                type="checkbox"
                className="mt-1"
                checked={syncBusinessDays}
                onChange={(event) => setSyncBusinessDays(event.target.checked)}
                disabled={isActivatingDays}
              />

              <span>
                <span className="font-semibold block">
                  Add to all locations
                </span>

                <span className="text-sm text-gray-500">
                  Create these business days for the other locations and keep
                  them synchronized.
                </span>
              </span>
            </label>
          )}

          <button
            className="w-full sm:w-[50%] sm:mx-auto md:w-fit md:ml-auto md:mr-0 block bg-emerald-300 border-[0.1rem] border-green-500 rounded-lg text-green-900 px-3 py-1 mt-5 disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            disabled={isActivatingDays}
            onClick={() => void activateBusinessDays(syncBusinessDays)}
          >
            {isActivatingDays ? "Activating..." : "Activate Business Days"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mt-3">
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
            className="w-fit bg-red-200 border-[0.1rem] border-red-500 rounded-md px-2 py-1 text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            disabled={isDeleting}
            onClick={() => void handleRemoveBusinessDays()}
          >
            {isDeleting ? "Removing..." : "Remove Business Days"}
          </button>
        </div>
      )}
    </section>
  );
}
