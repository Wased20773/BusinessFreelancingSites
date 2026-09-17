import type { SocialJson } from "@/types/types";
import type { Dispatch, SetStateAction } from "react";
import ListCard from "../ListCard";

type SocialListParams = {
  socialsData: SocialJson[];
  isLoading: boolean;
  errorMessage: string | null;
  canManage: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
};

export default function SocialsList({
  socialsData,
  isLoading,
  errorMessage,
  canManage,
  setIsLoading,
}: SocialListParams) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {isLoading ? (
        <p className="px-5 py-8 text-sm text-gray-600 sm:px-6">
          Loading socials...
        </p>
      ) : errorMessage ? (
        <p role="alert" className="px-5 py-8 text-sm text-red-700 sm:px-6">
          {errorMessage}
        </p>
      ) : socialsData.length === 0 ? (
        <div className="px-5 py-8 sm:px-6">
          <p className="font-semibold text-gray-900">You have no socials</p>
          <p className="mt-1 text-sm text-gray-600">
            {canManage
              ? "Add a social to help customers know where else they can find you."
              : "No socials have been added to this location."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile */}
          <ul className="md:hidden">
            {socialsData.map((social, idx) => (
              <ListCard
                key={social.id}
                variant="mobile"
                id={social.id}
                path={canManage ? `socials/${social.id}` : undefined}
                icon={social.icon}
                title={social.profileName}
                subtitle={social.domain}
                isLast={socialsData.length !== idx + 1}
                setIsLoading={setIsLoading}
              />
            ))}
          </ul>

          {/* Desktop */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Profile name
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Domain
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Platform
                  </th>
                  {canManage && <th scope="col" className="w-12 px-3 py-2" />}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {socialsData.map((social) => (
                  <ListCard
                    key={social.id}
                    variant="desktop"
                    id={social.id}
                    path={canManage ? `socials/${social.id}` : undefined}
                    icon={social.icon}
                    title={social.profileName}
                    subtitle={social.domain}
                    setIsLoading={setIsLoading}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
