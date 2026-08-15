import { ContactJson } from "@/types/types";
import PersonalIcon from "@/components/icons/placeholder-account-black.svg";
import BusinessIcon from "@/components/icons/business.svg";
import ListCard from "../ListCard";

type ContactsListParams = {
  isLoading: boolean;
  contactData: ContactJson[];
};

export default function ContactsList({
  isLoading,
  contactData,
}: ContactsListParams) {
  return (
    <section aria-label="contacts-list-heading">
      <div className="dashboard-card">
        {isLoading ? (
          <p>Loading contacts...</p>
        ) : contactData.length === 0 ? (
          <p>You have no contacts</p>
        ) : (
          <>
            {/* MOBILE */}
            <ul className="md:hidden">
              {contactData.map((contact, idx) => (
                <ListCard
                  key={contact.id}
                  variant="mobile"
                  id={contact.id}
                  path={`contacts/${contact.id}`}
                  icon={contact.isPersonal ? PersonalIcon : BusinessIcon}
                  title={contact.phoneNumber}
                  subtitle={contact.email}
                  isLast={contactData.length !== idx + 1}
                />
              ))}
            </ul>
            {/* DESKTOP */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">
                  Business contacts, including email addresses, phone numbers,
                  and contact types
                </caption>

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

                    <th scope="col" className="w-12 px-3 py-2">
                      <span className="sr-only">View contact</span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {contactData.map((contact) => (
                    <ListCard
                      key={contact.id}
                      variant="desktop"
                      id={contact.id}
                      path={`contacts/${contact.id}`}
                      icon={contact.isPersonal ? PersonalIcon : BusinessIcon}
                      title={contact.phoneNumber}
                      subtitle={contact.email}
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
