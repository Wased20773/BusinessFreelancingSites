"use client";

import ArrowIcon from "@/components/icons/arrow";
import CreateContactForm from "@/components/ui/contacts/CreateContactForm";
import { ACCESS_LEVEL, type ContactJson } from "@/types/types";
import { useSession } from "next-auth/react";
import PageState from "@/components/ui/PageState";
import axios from "axios";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { InputEvent, SubmitEvent, useState } from "react";
import { toast } from "sonner";

export default function CreateContactPage() {
  const params = useParams<{
    businessId: string;
    locationId: string;
  }>();

  const businessId = params.businessId;
  const locationId = params.locationId;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);
  const [isSynced, setIsSynced] = useState<boolean>(true);

  const router = useRouter();

  const { data: session, status } = useSession();

  const currentAccessLevel = session?.user?.accessLevel;

  const canCreateContact =
    currentAccessLevel === ACCESS_LEVEL.owner ||
    currentAccessLevel === ACCESS_LEVEL.admin;

  const isDeveloper = currentAccessLevel === ACCESS_LEVEL.developer;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsCreating(true);
    setErrorMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

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

      isSynced,
    };

    if (!requestBody.phoneNumber && !requestBody.email) {
      setErrorMessage(
        "A contact must include either a phone number or an email",
      );
      setIsCreating(false);
      return;
    }

    try {
      const contactToast = toast.promise<ContactJson>(
        axios
          .post<ContactJson>(
            `/api/businesses/${businessId}/locations/${locationId}/contacts`,
            requestBody,
          )
          .then((response) => response.data),
        {
          loading: "Creating contact...",
          success: "Contact created.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to create contact.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while creating the contact.",
            };
          },
        },
      );

      await contactToast.unwrap();

      form.reset();
      setCanSubmit(false);
      setIsSynced(true);

      router.push(
        `/businesses/${businessId}/locations/${locationId}/dashboard/contacts`,
      );
    } catch (error) {
      console.error("Error in Create Contact page: ", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to create the contact.",
        );
      } else {
        setErrorMessage("Failed to create the contact.");
      }
    } finally {
      setIsCreating(false);
    }
  }

  function handleFormInput(event: InputEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);

    const phoneNumber = formData.get("phoneNumber");
    const email = formData.get("email");

    const hasPhoneNumber =
      typeof phoneNumber === "string" && phoneNumber.trim() !== "";

    const hasEmail = typeof email === "string" && email.trim() !== "";

    setCanSubmit(hasPhoneNumber || hasEmail);
  }

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper,
    canView: canCreateContact,
    pageTitle: "Contacts",
    reason: "Your current access level does not allow contact creation.",
  });

  if (pageState) {
    return pageState;
  }

  return (
    <section
      aria-labelledby="create-contact-heading"
      className="max-w-[1000px] mx-auto p-5"
    >
      <header className="flex items-center gap-3">
        <Link
          href={`/businesses/${businessId}/locations/${locationId}/dashboard/contacts`}
          aria-label="Return to contacts"
          onClick={() => setIsLoading(true)}
        >
          <ArrowIcon direction="left" size={50} />
        </Link>

        <h1 id="create-contact-heading">Create Contact</h1>
      </header>

      <div className="mt-[1.5rem]">
        <CreateContactForm
          handleSubmit={handleSubmit}
          handleFormInput={handleFormInput}
          isCreating={isCreating}
          canSubmit={canSubmit}
          isSynced={isSynced}
          setIsSynced={setIsSynced}
        />
      </div>
    </section>
  );
}
