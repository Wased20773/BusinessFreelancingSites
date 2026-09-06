"use client";

import CreateButtonIcon from "@/components/icons/create-button.svg";
import Divider from "@/components/layout/Divider";
import ActionItem from "@/components/ui/ActionItem";
import ContactsList from "@/components/ui/contacts/ContactsList";
import type { ContactJson } from "@/types/types";
import axios from "axios";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import "../page.css";
import PageState from "@/components/ui/PageState";

export default function ContactsPage() {
  const params = useParams<{
    businessId: string;
    locationId: string;
  }>();

  const businessId = params.businessId;
  const locationId = params.locationId;

  const { data: session, status } = useSession();

  const [contactData, setContactData] = useState<ContactJson[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const accessLevel = session?.user?.accessLevel;
  const canManageContacts = accessLevel === "owner" || accessLevel === "admin";
  const canViewContacts = canManageContacts || accessLevel === "staff";
  const isDeveloper = accessLevel === "developer";

  useEffect(() => {
    async function getContactData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const contactsToast = toast.promise<ContactJson[]>(
          axios
            .get<{ contacts: ContactJson[] }>("/api/business/contacts", {
              headers: {
                "x-business-id": businessId,
                "x-location-id": locationId,
              },
            })
            .then((response) => response.data.contacts),
          {
            loading: "Loading contacts...",
            success: "Contacts loaded.",

            error: (error) => {
              if (
                axios.isAxiosError<{
                  error?: string;
                }>(error)
              ) {
                return {
                  message: "Failed to load contacts.",

                  description:
                    error.response?.data?.error ??
                    `Status code: ${error.response?.status ?? "No response"}`,
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

        if (
          axios.isAxiosError<{
            error?: string;
          }>(error)
        ) {
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

    /*
     * Developer access does not include
     * dashboard contact information.
     *
     * Staff can retrieve the data because
     * they have read-only access.
     */
    if (status === "authenticated" && canViewContacts) {
      void getContactData();
    }
  }, [businessId, locationId, status, canViewContacts]);

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper,
    canView: canViewContacts,
    pageTitle: "Contacts",
    reason:
      "Your current access level does not include dashboard contact access.",
  });

  if (pageState) {
    return pageState;
  }

  return (
    <section
      aria-labelledby="contacts-heading"
      className="max-w-[1000px] mx-auto p-5"
    >
      <h1 id="contacts-heading">Contacts</h1>

      <div className="mt-[1.5rem]">
        {/* Management Actions */}
        {canManageContacts && (
          <>
            <nav className="dashboard-card" aria-label="Contact actions">
              <ActionItem
                href={`/businesses/${businessId}/locations/${locationId}/dashboard/contacts/create`}
                icon={CreateButtonIcon}
                label="Create Contact"
                setIsLoading={setIsLoading}
              />
            </nav>

            <Divider />
          </>
        )}

        <ContactsList
          isLoading={isLoading}
          contactData={contactData}
          errorMessage={errorMessage}
          canManage={canManageContacts}
          setIsLoading={setIsLoading}
        />
      </div>
    </section>
  );
}
