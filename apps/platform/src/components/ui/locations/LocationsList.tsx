import ListCard from "../ListCard";
import PinpointIcon from "@/components/icons/pinpoint.svg";
import "@/app/dashboard/(protected)/page.css";
import { LocationJson } from "@/types/types";

type LocationListParams = {
  isLoading: boolean;
  locationData: LocationJson[];
};

export default function LocationsList({
  isLoading,
  locationData,
}: LocationListParams) {
  return (
    <section aria-label="locations-list-heading">
      <div className="dashboard-card">
        {isLoading ? (
          <p>Loading locations...</p>
        ) : locationData.length === 0 ? (
          <p>You have no locations</p>
        ) : (
          <>
            {/* MOBILE */}
            <ul className="md:hidden">
              {locationData.map((location, idx) => (
                <ListCard
                  key={location.id}
                  variant={"mobile"}
                  id={location.id}
                  path={`/dashboard/locations/${location.id}`}
                  // icon={PinpointIcon}
                  title={location.address}
                  subtitle={location.zip}
                  isLast={locationData.length !== idx + 1}
                  status={{ isActive: location.isActive }}
                />
              ))}
            </ul>

            {/* DESKTOP */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">
                  Business locations, including address, zip, and if it is an
                  active location
                </caption>

                <thead>
                  <tr className="border-b border-gray-600">
                    <th
                      scope="col"
                      className="px-3 py-2 font-semibold text-center"
                    >
                      Active
                    </th>

                    <th scope="col" className="px-3 py-2 font-semibold">
                      Address
                    </th>

                    <th scope="col" className="px-3 py-2 font-semibold">
                      zip
                    </th>

                    <th scope="col" className="w-12 px-3 py-2">
                      <span className="sr-only">View location</span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {locationData.map((location) => (
                    <ListCard
                      key={location.id}
                      variant="desktop"
                      id={location.id}
                      path={`/dashboard/locations/${location.id}`}
                      // icon={PinpointIcon}
                      title={location.address}
                      subtitle={location.zip}
                      status={{ isActive: location.isActive }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
