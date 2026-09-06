import BusinessIcon from "@/components/icons/business.svg";
import PersonalIcon from "@/components/icons/placeholder-account-black.svg";
import type { ContactJson } from "@/types/types";
import ListCard from "../ListCard";
import { Dispatch, SetStateAction } from "react";

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
    <section aria-labelledby="contacts-list-heading">
      <div className="dashboard-card">
        {isLoading ? (
          <p>Loading contacts...</p>
        ) : errorMessage ? (
          <p role="alert">{errorMessage}</p>
        ) : contactData.length === 0 ? (
          <div>
            <p className="font-semibold">You have no contacts</p>

            <p className="text-gray-500">
              {canManage
                ? "Add a contact to help customers know who to contact."
                : "No contacts have been added to this location."}
            </p>
          </div>
        ) : (
          <>
            {/* MOBILE */}
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

            {/* DESKTOP */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Phone
                    </th>

                    <th scope="col" className="px-3 py-2 font-semibold">
                      Email
                    </th>

                    <th scope="col" className="px-3 py-2 font-semibold">
                      Type
                    </th>

                    {canManage && <th scope="col" className="w-12 px-3 py-2" />}
                  </tr>
                </thead>

                <tbody className="divide-y">
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
    </section>
  );
}
