"use client";

import CreateButtonIcon from "@/components/icons/create-button.svg";
import Divider from "@/components/layout/Divider";
import ActionItem from "@/components/ui/ActionItem";
import { useEffect, useState } from "react";
import { ContactJson } from "@/types/types";
import axios from "axios";
import { toast } from "sonner";
import "../page.css";
import ContactsList from "@/components/ui/contacts/ContactsList";
import { useParams } from "next/navigation";

export default function ContactsPage() {
  const params = useParams<{
    businessId: string;
    locationId: string;
  }>();

  const businessId = params.businessId;
  const locationId = params.locationId;

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
              if (axios.isAxiosError<{ error?: string }>(error)) {
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
  }, [businessId, locationId]);

  return (
    <section aria-labelledby="contacts-heading">
      <h1 id="contacts-heading">Contacts</h1>

      <div className="mt-[1.5rem]">
        {/* Links */}
        <nav className="dashboard-card" aria-label="Contact actions">
          {/* Create Contact */}
          <ActionItem
            href={`/businesses/${businessId}/locations/${locationId}/dashboard/contacts/create`}
            icon={CreateButtonIcon}
            label="Create Contact"
          />
        </nav>

        <Divider />

        <ContactsList isLoading={isLoading} contactData={contactData} />
      </div>
    </section>
  );
}
