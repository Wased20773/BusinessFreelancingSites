"use client";

import ArrowIcon from "@/components/icons/arrow";
import CreateContactForm from "@/components/ui/contacts/CreateContactForm";
import { ContactJson } from "@/types/types";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InputEvent, SubmitEvent, useState } from "react";
import { toast } from "sonner";

export default function CreateContactPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);

  const router = useRouter();

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
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
    };

    if (!requestBody.phoneNumber && !requestBody.email) {
      setErrorMessage(
        "A contact must include either a phone number or an email",
      );
      setIsLoading(false);
      return;
    }

    try {
      const contactToast = toast.promise<ContactJson>(
        axios
          .post<ContactJson>("/api/admin/contacts", requestBody)
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
      router.push("/dashboard/contacts");
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
      setIsLoading(false);
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

  return (
    <section aria-labelledby="create-contact-heading">
      <header className="flex items-center gap-3">
        <Link href="/dashboard/contacts">
          <ArrowIcon direction="left" size={50} />
        </Link>
        <h1 id="create-contact-heading">Create Contact</h1>
      </header>

      <div className="mt-[1.5rem]">
        <CreateContactForm
          handleSubmit={handleSubmit}
          handleFormInput={handleFormInput}
          isLoading={isLoading}
          canSubmit={canSubmit}
        />
      </div>
    </section>
  );
}
