"use client";

import ArrowIcon from "@/components/icons/arrow";
import type { ContactJson } from "@/types/types";
import axios from "axios";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

export default function EditContactPage() {
  const params = useParams<{ contactId: string }>();
  const router = useRouter();

  const contactId = params.contactId;

  const [contactData, setContactData] = useState<ContactJson | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [canSubmit, setCanSubmit] = useState<boolean>(false);

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
        setCanSubmit(
          Boolean(selectedContact.phoneNumber || selectedContact.email),
        );
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

    void getContactData();
  }, [contactId]);

  function handleFormInput(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);

    const phoneNumber = formData.get("phoneNumber");
    const email = formData.get("email");

    const hasPhoneNumber =
      typeof phoneNumber === "string" && phoneNumber.trim() !== "";

    const hasEmail = typeof email === "string" && email.trim() !== "";

    setCanSubmit(hasPhoneNumber || hasEmail);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const phoneNumber = formData.get("phoneNumber");
    const email = formData.get("email");
    const contactType = formData.get("contactType");

    const requestBody = {
      phoneNumber:
        typeof phoneNumber === "string" && phoneNumber.trim()
          ? phoneNumber.trim()
          : null,

      email: typeof email === "string" && email.trim() ? email.trim() : null,

      isPersonal: contactType !== null,
    };

    if (!requestBody.phoneNumber && !requestBody.email) {
      setErrorMessage(
        "A contact must include either a phone number or an email",
      );

      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updateToast = toast.promise(
        axios
          .patch(`/api/admin/contacts/${contactId}`, requestBody)
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

      await updateToast.unwrap();
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
          .delete(`/api/admin/contacts/${contactId}`)
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

      router.push("/dashboard/contacts");
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

  if (isLoading) {
    return <p>Loading contact</p>;
  }

  if (errorMessage && !contactData) {
    return <p>{errorMessage}</p>;
  }

  if (!contactData) {
    return <p>This contact could not be found.</p>;
  }

  const isProcessing = isSaving || isDeleting;

  return (
    <section aria-labelledby="edit-contact-heading">
      <header className="flex items-center gap-3">
        <Link href="/dashboard/contacts" aria-label="Return to contacts">
          <ArrowIcon direction="left" size={50} />
        </Link>

        <h1 id="edit-contact-heading">Edit Contact</h1>
      </header>

      <div className="mt-[1.5rem]">
        <form
          className="dashboard-card flex flex-col gap-5 p-4"
          onSubmit={handleSubmit}
          onInput={handleFormInput}
        >
          <fieldset disabled={isProcessing}>
            <legend>Contact info</legend>

            <div>
              <label htmlFor="contact-phone-number">Phone number</label>

              <input
                className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                id="contact-phone-number"
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
                placeholder="000-000-0000"
                defaultValue={contactData.phoneNumber ?? ""}
              />
            </div>

            <div>
              <label htmlFor="contact-email">Email</label>

              <input
                className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={contactData.email ?? ""}
              />
            </div>
          </fieldset>

          <fieldset disabled={isProcessing}>
            <legend>Contact type</legend>

            <label htmlFor="contact-personal" className="cursor-pointer">
              <input
                className="mr-2"
                id="contact-personal"
                name="contactType"
                type="checkbox"
                defaultChecked={contactData.isPersonal}
              />
              Personal?
            </label>
          </fieldset>

          {errorMessage && <p role="alert">{errorMessage}</p>}

          <button
            className="bg-emerald-300 border-[0.1rem] border-emerald-500 rounded-md text-emerald-900 px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            type="submit"
            disabled={isProcessing || !canSubmit}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>

          <button
            className="bg-red-300 border-[0.1rem] border-red-500 rounded-md text-red-900 px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            disabled={isProcessing}
            onClick={handleDelete}
          >
            {isDeleting ? "Deleting..." : "Delete Contact"}
          </button>
        </form>
      </div>
    </section>
  );
}
