import ArrowIcon from "@/components/icons/arrow";
import { BusinessOwnerShip } from "@/types/types";
import { Dispatch, SetStateAction } from "react";

type BusinessListProps = {
  businesses: BusinessOwnerShip[];
  setCreateErrorMessage: Dispatch<SetStateAction<string | null>>;
  setIsCreatingBusiness: Dispatch<SetStateAction<boolean>>;
  handleBusinessSelect(businessId: string): Promise<void>;
};

export default function BusinessList({
  businesses,
  setCreateErrorMessage,
  setIsCreatingBusiness,
  handleBusinessSelect,
}: BusinessListProps) {
  return (
    <>
      {/* ######################## */}
      {/* ##### Empty State ##### */}
      {/* ######################## */}
      {businesses.length === 0 ? (
        <section className="border-[0.15rem] border-dashed border-gray-300 rounded-lg px-8 py-5 text-center">
          <h2 className="text-lg font-semibold">None Found</h2>

          <p className="text-gray-500">
            You are not currently connected to any business. Create your own or
            wait to be added to an existing business.
          </p>
        </section>
      ) : (
        /* ########################### */
        /* ##### Business List ####### */
        /* ########################### */
        <section>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {businesses.map((businessUser) => (
              <li key={businessUser.id}>
                <button
                  type="button"
                  onClick={() =>
                    void handleBusinessSelect(businessUser.business.id)
                  }
                  className="block w-full h-full text-left border border-gray-100 rounded-lg shadow-md px-4 py-4 hover:border-blue-400 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col h-full">
                    <h2 className="font-semibold text-lg">
                      {businessUser.business.name}
                    </h2>

                    <p className="text-sm text-gray-500 capitalize">
                      {businessUser.role.accessLevel}
                    </p>

                    {businessUser.business.domain && (
                      <p className="text-sm text-gray-500">
                        {businessUser.business.domain}
                      </p>
                    )}

                    <p className="flex items-center gap-2 text-blue-500 mt-auto pt-5">
                      <span>View locations</span>
                      <ArrowIcon size={15} />
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
