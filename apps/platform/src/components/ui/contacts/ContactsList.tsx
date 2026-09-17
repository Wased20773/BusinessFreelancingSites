import BusinessIcon from "@/components/icons/business.svg";
import PersonalIcon from "@/components/icons/placeholder-account-black.svg";
import type { ContactJson } from "@/types/types";
import type { Dispatch, SetStateAction } from "react";
import ListCard from "../ListCard";

type ContactsListParams = {
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  contactData: ContactJson[];
  errorMessage: string | null;
  canManage: boolean;
};

export default function ContactsList({
  isLoading,
  setIsLoading,
  contactData,
  errorMessage,
  canManage,
}: ContactsListParams) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {isLoading ? (
        <p className="px-5 py-8 text-sm text-gray-600 sm:px-6">
          Loading contacts...
        </p>
      ) : errorMessage ? (
        <p role="alert" className="px-5 py-8 text-sm text-red-700 sm:px-6">
          {errorMessage}
        </p>
      ) : contactData.length === 0 ? (
        <div className="px-5 py-8 sm:px-6">
          <p className="font-semibold text-gray-900">You have no contacts</p>
          <p className="mt-1 text-sm text-gray-600">
            {canManage
              ? "Add a contact to help customers know who to contact."
              : "No contacts have been added to this location."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile */}
          <ul className="md:hidden">
            {contactData.map((contact, idx) => (
              <ListCard
                key={contact.id}
                variant="mobile"
                id={contact.id}
                path={canManage ? `contacts/${contact.id}` : undefined}
                icon={contact.isPersonal ? PersonalIcon : BusinessIcon}
                title={contact.phoneNumber}
                subtitle={contact.email}
                isLast={contactData.length !== idx + 1}
                setIsLoading={setIsLoading}
              />
            ))}
          </ul>

          {/* Desktop */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Phone
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Email
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Type
                  </th>
                  {canManage && <th scope="col" className="w-12 px-3 py-3" />}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {contactData.map((contact) => (
                  <ListCard
                    key={contact.id}
                    variant="desktop"
                    id={contact.id}
                    path={canManage ? `contacts/${contact.id}` : undefined}
                    icon={contact.isPersonal ? PersonalIcon : BusinessIcon}
                    title={contact.phoneNumber}
                    subtitle={contact.email}
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
