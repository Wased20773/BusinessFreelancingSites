"use client";

import ArrowIcon from "@/components/icons/arrow";
import CalendarIcon from "@/components/icons/calendar.svg";
import EditIcon from "@/components/icons/edit.svg";
import type { LocationJson } from "@/types/types";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";

type CreateDaysFormProps = {
  locationData: LocationJson;
  hasMultipleLocations: boolean;
  isActivatingDays: boolean;
  isDeleting: boolean;
  canManage: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  activateBusinessDays: (isSynced: boolean) => Promise<void>;
  handleRemoveBusinessDays: () => Promise<void>;
};

export default function CreateDaysForm({
  locationData,
  hasMultipleLocations,
  isActivatingDays,
  isDeleting,
  canManage,
  setIsLoading,
  activateBusinessDays,
  handleRemoveBusinessDays,
}: CreateDaysFormProps) {
  const [syncBusinessDays, setSyncBusinessDays] = useState<boolean>(false);
  const hasBusinessDays = locationData.days.length > 0;

  return (
    <section
      aria-labelledby="business-days-heading"
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src={CalendarIcon}
            alt=""
            aria-hidden="true"
            width={28}
            height={28}
          />
          <h2
            id="business-days-heading"
            className="text-lg font-semibold text-gray-900"
          >
            Business Days
          </h2>
        </div>

        {hasBusinessDays && (
          <Link
            href="location/days/edit"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-500"
            aria-label={canManage ? "Edit business days" : "View business days"}
            onClick={() => setIsLoading(true)}
          >
            {canManage ? (
              <Image
                src={EditIcon}
                alt=""
                aria-hidden="true"
                width={20}
                height={20}
              />
            ) : (
              <ArrowIcon direction="right" size={20} />
            )}
          </Link>
        )}
      </div>

      <div className="px-5 py-5 sm:px-6">
        {!hasBusinessDays ? (
          <div>
            <p className="text-sm leading-6 text-gray-600">
              Business days have not been activated for this location.{" "}
              {canManage &&
                "Activating business days will allow you to manage which days this location is open or closed."}
            </p>

            {canManage && (
              <>
                {hasMultipleLocations && (
                  <label
                    htmlFor="sync-business-days"
                    className="mt-4 flex cursor-pointer items-start gap-2"
                  >
                    <input
                      id="sync-business-days"
                      name="sync-business-days"
                      type="checkbox"
                      className="mt-1"
                      checked={syncBusinessDays}
                      onChange={(event) =>
                        setSyncBusinessDays(event.target.checked)
                      }
                      disabled={isActivatingDays}
                    />

                    <span>
                      <span className="block font-semibold text-gray-900">
                        Add to all locations
                      </span>
                      <span className="text-sm text-gray-600">
                        Create these business days for the other locations and
                        keep them synchronized.
                      </span>
                    </span>
                  </label>
                )}

                <div className="mt-5 flex justify-end">
                  <button
                    className="rounded-lg border border-emerald-500 bg-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                    type="button"
                    disabled={isActivatingDays}
                    onClick={() => void activateBusinessDays(syncBusinessDays)}
                  >
                    {isActivatingDays
                      ? "Activating..."
                      : "Activate Business Days"}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div>
            <p className="mb-4 text-sm text-gray-600">
              {canManage
                ? "Manage days and their hours."
                : "View days and their hours."}
            </p>

            <div className="divide-y divide-gray-200">
              {locationData.days.map((day) => (
                <div
                  key={day.id}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <p className="font-medium text-gray-900">{day.dayOfWeek}</p>
                  <p className="text-gray-600">
                    {day.isClosed ? "Closed" : "Open"}
                  </p>
                </div>
              ))}
            </div>

            {canManage && (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <button
                  className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  type="button"
                  disabled={isDeleting}
                  onClick={() => void handleRemoveBusinessDays()}
                >
                  {isDeleting ? "Removing..." : "Remove Business Days"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
