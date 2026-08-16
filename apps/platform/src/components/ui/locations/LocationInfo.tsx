import Image from "next/image";
import Link from "next/link";
import EditIcon from "@/components/icons/edit.svg";
import { LocationJson } from "@/types/types";

type LocationInfoParams = {
  locationId: string;
  locationData: LocationJson;
};

export default function LocationInfo({
  locationId,
  locationData,
}: LocationInfoParams) {
  return (
    <section
      className="dashboard-card p-4"
      aria-labelledby="location-info-heading"
    >
      <div className="flex justify-between items-center">
        <h2 id="location-info-heading">Location Information</h2>

        <Link href={`${locationId}/edit`} className="shrink-0">
          <Image
            src={EditIcon}
            alt=""
            aria-hidden="true"
            className="md:min-w-[30px] min-w-[50px] h-fit"
          />
        </Link>
      </div>

      <div className="mt-3">
        <p className="font-semibold">Address</p>
        <p>{locationData.address}</p>
      </div>

      <div className="mt-3">
        <p className="font-semibold">City</p>
        <p>{locationData.city || "Not stated"}</p>
      </div>

      <div className="mt-3">
        <p className="font-semibold">State</p>
        <p>{locationData.state || "Not stated"}</p>
      </div>

      <div className="mt-3">
        <p className="font-semibold">ZIP / Postal Code</p>
        <p>{locationData.zip || "Not stated"}</p>
      </div>

      <div className="mt-3">
        <p className="font-semibold">Country</p>
        <p>{locationData.country || "Not stated"}</p>
      </div>

      <div className="mt-3">
        <p className="font-semibold">Parking Available</p>
        <p>{locationData.parking ? "Yes" : "No"}</p>
      </div>

      <div className="mt-3">
        <p className="font-semibold">Active</p>
        <p>{locationData.isActive ? "Yes" : "No"}</p>
      </div>

      <div className="mt-3">
        <p className="font-semibold">Business Hours Enabled</p>
        <p>{locationData.enableHours ? "Yes" : "No"}</p>
      </div>
    </section>
  );
}
