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
        <section className="border-[0.1rem] border-gray-300 rounded-lg px-5 py-8 text-center">
          <h2 className="text-lg font-semibold">No businesses yet</h2>

          <p className="text-gray-500 mt-2">
            You are not currently connected to any businesses.
          </p>

          <p className="text-gray-500 mt-1">
            Create your own business or wait to be added to an existing
            business.
          </p>

          <button
            className="bg-emerald-300 border-[0.1rem] border-green-500 rounded-lg text-green-900 px-3 py-2 mt-5"
            type="button"
            onClick={() => {
              setCreateErrorMessage(null);
              setIsCreatingBusiness(true);
            }}
          >
            Create Business
          </button>
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
                  className="block w-full h-full text-left border-[0.1rem] border-gray-300 rounded-lg px-4 py-4 hover:border-blue-400 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col h-full">
                    <h2 className="font-semibold text-lg">
                      {businessUser.business.name}
                    </h2>

                    <p className="text-sm text-gray-500 capitalize mt-1">
                      {businessUser.role.accessLevel}
                    </p>

                    {businessUser.business.domain && (
                      <p className="text-sm text-gray-500 break-all mt-3">
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
