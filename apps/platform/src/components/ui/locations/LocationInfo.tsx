import EditIcon from "@/components/icons/edit.svg";
import type { LocationJson } from "@/types/types";
import Image from "next/image";
import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";

type LocationInfoParams = {
  locationData: LocationJson;
  canManage: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
};

export default function LocationInfo({
  locationData,
  canManage,
  setIsLoading,
}: LocationInfoParams) {
  return (
    <section
      aria-labelledby="location-info-heading"
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
        <h2
          id="location-info-heading"
          className="text-lg font-semibold text-gray-900"
        >
          Location Information
        </h2>

        {canManage && (
          <Link
            href="location/edit"
            aria-label="Edit location information"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-500"
            onClick={() => setIsLoading(true)}
          >
            <Image
              src={EditIcon}
              alt=""
              aria-hidden="true"
              width={20}
              height={20}
            />
          </Link>
        )}
      </div>

      <dl className="grid gap-x-6 gap-y-4 px-5 py-5 text-sm sm:grid-cols-2 sm:px-6">
        <div className="sm:col-span-2">
          <dt className="font-medium text-gray-600">Address</dt>
          <dd className="mt-1 break-words font-medium text-gray-900">
            {locationData.address}
          </dd>
        </div>

        <div>
          <dt className="font-medium text-gray-600">City</dt>
          <dd className="mt-1 text-gray-900">
            {locationData.city || "Not stated"}
          </dd>
        </div>

        <div>
          <dt className="font-medium text-gray-600">State</dt>
          <dd className="mt-1 text-gray-900">
            {locationData.state || "Not stated"}
          </dd>
        </div>

        <div>
          <dt className="font-medium text-gray-600">ZIP / Postal Code</dt>
          <dd className="mt-1 text-gray-900">
            {locationData.zip || "Not stated"}
          </dd>
        </div>

        <div>
          <dt className="font-medium text-gray-600">Country</dt>
          <dd className="mt-1 text-gray-900">
            {locationData.country || "Not stated"}
          </dd>
        </div>

        <div>
          <dt className="font-medium text-gray-600">Parking Available</dt>
          <dd className="mt-1 text-gray-900">
            {locationData.parking ? "Yes" : "No"}
          </dd>
        </div>

        <div>
          <dt className="font-medium text-gray-600">Active</dt>
          <dd className="mt-1 text-gray-900">
            {locationData.isActive ? "Yes" : "No"}
          </dd>
        </div>

        <div>
          <dt className="font-medium text-gray-600">Business Hours Enabled</dt>
          <dd className="mt-1 text-gray-900">
            {locationData.enableHours ? "Yes" : "No"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
