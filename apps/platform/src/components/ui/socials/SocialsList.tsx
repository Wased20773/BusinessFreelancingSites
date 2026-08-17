import { SocialJson } from "@/types/types";
import ListCard from "../ListCard";

type SocialListParams = {
  socialsData: SocialJson[];
  isLoading: boolean;
};

export default function SocialsList({
  socialsData,
  isLoading,
}: SocialListParams) {
  return (
    <section aria-label="socials-list-heading">
      <div className="dashboard-card">
        {isLoading ? (
          <p>Loading socials...</p>
        ) : socialsData.length === 0 ? (
          <div>
            <p className="font-semibold">You have no socials</p>
            <p className="text-gray-500">
              Add a social to help customers know where else they can find you
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
                  path={`socials/${social.id}`}
                  icon={social.icon}
                  title={social.profileName}
                  subtitle={social.domain}
                  isLast={socialsData.length !== idx + 1}
                />
              ))}
            </ul>
            {/* DESKTOP */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">
                  Business socials, including profile name, domain, and the
                  platform
                </caption>

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

                    <th scope="col" className="w-12 px-3 py-2">
                      <span className="sr-only">Edit socials</span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {/* TODO: Render the desktop view socials */}
                  {socialsData.map((social) => (
                    <ListCard
                      key={social.id}
                      variant="desktop"
                      id={social.id}
                      path={`socials/${social.id}`}
                      icon={social.icon}
                      title={social.profileName}
                      subtitle={social.domain}
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
