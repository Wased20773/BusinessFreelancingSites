"use client";

import Image from "next/image";
import Link from "next/link";
import CreateButtonIcon from "@/components/icons/create-button.svg";
import Divider from "@/components/layout/Divider";
import ActionItem from "@/components/ui/ActionItem";
import BusinessIcon from "@/components/icons/business.svg";
import PersonalIcon from "@/components/icons/placeholder-account-black.svg";
import EditIcon from "@/components/icons/edit.svg";
import { useEffect, useState } from "react";
import { ContactJson } from "@/types/types";
import axios from "axios";
import { toast } from "sonner";
import "../page.css";
import ListCard from "@/components/ui/ListCard";

export default function ContactsPage() {
  const [contactData, setContactData] = useState<ContactJson[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function getContactData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const contactsToast = toast.promise<ContactJson[]>(
          axios
            .get<{ contacts: ContactJson[] }>("/api/business/contacts")
            .then((response) => response.data.contacts),
          {
            loading: "Loading contacts...",
            success: "Contacts loaded.",
            error: (error) => {
              if (axios.isAxiosError<{ error?: string }>(error)) {
                return {
                  message: "Failed to load contacts.",
                  description: `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error.",
                description: "Something went wrong while loading the contacts.",
              };
            },
          },
        );

        const data = await contactsToast.unwrap();

        setContactData(data);
      } catch (error) {
        console.error("Error in Contacts page:", error);

        if (axios.isAxiosError<{ error?: string }>(error)) {
          setErrorMessage(
            error.response?.data?.error ?? "Failed to load contact data.",
          );
        } else {
          setErrorMessage("Failed to load contact data.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    void getContactData();
  }, []);

  return (
    <section aria-labelledby="contacts-heading">
      <h1 id="contacts-heading">Contacts</h1>

      {/* Business.contacts: id, phoneNumber, email, isPersonal */}

      <div className="mt-[1.5rem]">
        {/* Links */}
        <nav className="dashboard-card" aria-label="Contact actions">
          {/* Create Contact */}
          <ActionItem
            href="/dashboard/contacts/create"
            icon={CreateButtonIcon}
            label="Create Contact"
          />
        </nav>

        <Divider />

        <section aria-label="contacts-list-heading">
          <div className="dashboard-card">
            {/* TODO: No current contacts */}
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
                      Business contacts, including email addresses, phone
                      numbers, and contact types
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
                      {/* TODO: Render the desktop view contacts */}
                      {contactData.map((contact) => (
                        <ListCard
                          key={contact.id}
                          variant="desktop"
                          id={contact.id}
                          path={`contacts/${contact.id}`}
                          icon={
                            contact.isPersonal ? PersonalIcon : BusinessIcon
                          }
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
      </div>
    </section>
  );
}
