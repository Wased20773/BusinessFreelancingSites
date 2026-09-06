import type { SocialJson } from "@/types/types";
import ListCard from "../ListCard";
import { Dispatch, SetStateAction } from "react";

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
    <section>
      <div className="dashboard-card">
        {isLoading ? (
          <p>Loading socials...</p>
        ) : errorMessage ? (
          <p role="alert">{errorMessage}</p>
        ) : socialsData.length === 0 ? (
          <div>
            <p className="font-semibold">You have no socials</p>

            <p className="text-gray-500">
              {canManage
                ? "Add a social to help customers know where else they can find you."
                : "No socials have been added to this location."}
            </p>
          </div>
        ) : (
          <>
            {/* MOBILE */}
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

            {/* DESKTOP */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-600">
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

                <tbody className="divide-y">
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
    </section>
  );
}
