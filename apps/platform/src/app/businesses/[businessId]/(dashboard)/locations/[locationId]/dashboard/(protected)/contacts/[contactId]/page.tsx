"use client";

import EditContactForm from "@/components/ui/contacts/EditContactForm";
import PageHeading from "@/components/ui/PageHeader";
import PageState from "@/components/ui/PageState";
import { ACCESS_LEVEL, type ContactJson } from "@/types/types";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  type InputEvent,
  type SubmitEvent,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";

type ContactDraft = {
  phoneNumber: string | null;
  email: string | null;
  isPersonal: boolean;
};

type FormChangeEvent =
  | InputEvent<HTMLFormElement>
  | ChangeEvent<HTMLFormElement>;

function normalizeValue(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  return value.trim() || null;
}

function draftFromContact(contact: ContactJson): ContactDraft {
  return {
    phoneNumber: contact.phoneNumber?.trim() || null,
    email: contact.email?.trim() || null,
    isPersonal: contact.isPersonal,
  };
}

export default function EditContactPage() {
  const params = useParams<{
    businessId: string;
    locationId: string;
    contactId: string;
  }>();

  const router = useRouter();

  const businessId = params.businessId;
  const locationId = params.locationId;
  const contactId = params.contactId;

  const [contactData, setContactData] = useState<ContactJson | null>(null);
  const [draft, setDraft] = useState<ContactDraft | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: session, status } = useSession();
  const currentAccessLevel = session?.user?.accessLevel;

  const canManageContacts =
    currentAccessLevel === ACCESS_LEVEL.owner ||
    currentAccessLevel === ACCESS_LEVEL.admin;

  const isDeveloper = currentAccessLevel === ACCESS_LEVEL.developer;

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
            loading: "Loading contact...",
            success: "Contact loaded.",
            error: (error) => {
              if (axios.isAxiosError<{ error?: string }>(error)) {
                return {
                  message: "Failed to load contact.",
                  description:
                    error.response?.data?.error ??
                    `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error.",
                description: "Something went wrong while loading the contact.",
              };
            },
          },
        );

        const contacts = await contactsToast.unwrap();
        const selectedContact = contacts.find(
          (contact) => contact.id === contactId,
        );

        if (!selectedContact) {
          setErrorMessage("This contact could not be found.");
          return;
        }

        setContactData(selectedContact);
        setDraft(draftFromContact(selectedContact));
        setIsSynced(selectedContact.isSynced);
      } catch (error) {
        console.error("Error in Edit Contact page:", error);

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

    if (status === "authenticated" && canManageContacts) {
      void getContactData();
    }
  }, [businessId, locationId, contactId, status, canManageContacts]);

  function handleFormInput(event: FormChangeEvent) {
    const formData = new FormData(event.currentTarget);

    setDraft({
      phoneNumber: normalizeValue(formData.get("phoneNumber")),
      email: normalizeValue(formData.get("email")),
      isPersonal: formData.has("contactType"),
    });
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!contactData) return;

    const formData = new FormData(event.currentTarget);

    const requestBody = {
      phoneNumber: normalizeValue(formData.get("phoneNumber")),
      email: normalizeValue(formData.get("email")),
      isPersonal: formData.has("contactType"),
      isSynced,
    };

    if (!requestBody.phoneNumber && !requestBody.email) {
      setErrorMessage(
        "A contact must include either a phone number or an email",
      );
      return;
    }

    const saved = draftFromContact(contactData);

    const hasChanges =
      requestBody.phoneNumber !== saved.phoneNumber ||
      requestBody.email !== saved.email ||
      requestBody.isPersonal !== saved.isPersonal ||
      requestBody.isSynced !== contactData.isSynced;

    if (!hasChanges) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updateToast = toast.promise<ContactJson>(
        axios
          .patch<ContactJson>(
            `/api/businesses/${businessId}/locations/${locationId}/contacts/${contactId}`,
            requestBody,
          )
          .then((response) => response.data),
        {
          loading: "Updating contact...",
          success: "Contact updated.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to update contact.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while updating the contact.",
            };
          },
        },
      );

      const updatedContact = await updateToast.unwrap();

      setContactData(updatedContact);
      setDraft(draftFromContact(updatedContact));
      setIsSynced(updatedContact.isSynced);
    } catch (error) {
      console.error("Error updating contact:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to update the contact.",
        );
      } else {
        setErrorMessage("Failed to update the contact.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const deleteToast = toast.promise(
        axios
          .delete(
            `/api/businesses/${businessId}/locations/${locationId}/contacts/${contactId}`,
            {
              data: {
                deleteAllSynced: isSynced,
              },
            },
          )
          .then((response) => response.data),
        {
          loading: "Deleting contact...",
          success: "Contact deleted.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to delete contact.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while deleting the contact.",
            };
          },
        },
      );

      await deleteToast.unwrap();

      router.push(
        `/businesses/${businessId}/locations/${locationId}/dashboard/contacts`,
      );
    } catch (error) {
      console.error("Error deleting contact:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to delete the contact.",
        );
      } else {
        setErrorMessage("Failed to delete the contact.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper,
    canView: canManageContacts,
    pageTitle: "Contacts",
    reason: "Your current access level does not allow contact management.",
  });

  if (pageState) return pageState;

  if (errorMessage && !contactData) {
    return (
      <p role="alert" className="p-5">
        {errorMessage}
      </p>
    );
  }

  if (!contactData) {
    return <p className="p-5">This contact could not be found.</p>;
  }

  const saved = draftFromContact(contactData);

  const hasChanges =
    draft !== null &&
    (draft.phoneNumber !== saved.phoneNumber ||
      draft.email !== saved.email ||
      draft.isPersonal !== saved.isPersonal ||
      isSynced !== contactData.isSynced);

  const hasContactMethod = Boolean(draft?.phoneNumber || draft?.email);
  const canSubmit = hasChanges && hasContactMethod;
  const isProcessing = isSaving || isDeleting;

  return (
    <section
      aria-labelledby="edit-contact-heading"
      className="max-w-[1000px] mx-auto p-5 pt-0"
    >
      <PageHeading
        path={`/businesses/${businessId}/locations/${locationId}/dashboard/contacts`}
        ariaLabel="Return to contacts"
        setIsLoading={setIsLoading}
        headingId="edit-contact-heading"
        heading="Edit Contact"
      />

      <div className="mt-[0.5rem]">
        <EditContactForm
          contactData={contactData}
          isProcessing={isProcessing}
          errorMessage={errorMessage}
          canSubmit={canSubmit}
          isSaving={isSaving}
          isDeleting={isDeleting}
          isSynced={isSynced}
          setIsSynced={setIsSynced}
          handleSubmit={handleSubmit}
          handleFormInput={handleFormInput}
          handleDelete={handleDelete}
        />
      </div>
    </section>
  );
}
