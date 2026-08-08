"use client";

import ArrowIcon from "@/components/icons/arrow";
import { ContactJson } from "@/types/types";
import axios from "axios";
import Link from "next/link";
import { SubmitEvent, useState } from "react";
import { toast } from "sonner";

export default function CreateContactPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);

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

      // on successful creation, clear the form for re-use
      form.reset();
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

  function handleFormInput(event: React.FormEvent<HTMLFormElement>) {
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
        <form
          className="dashboard-card flex flex-col gap-5 p-4"
          onSubmit={handleSubmit}
          onInput={handleFormInput}
        >
          <fieldset>
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
                disabled={isLoading}
                placeholder="000-000-0000"
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
                disabled={isLoading}
              />
            </div>
          </fieldset>

          <fieldset>
            <legend>Contact type</legend>

            <label htmlFor="contact-personal" className="cursor-pointer">
              <input
                className="mr-2"
                id="contact-personal"
                name="contactType"
                type="checkbox"
              />
              Personal?
            </label>
          </fieldset>

          <button
            className="
                border-[0.1rem] border-emerald-500 rounded-md
                bg-emerald-300 text-emerald-900
                transition-opacity disabled:cursor-not-allowed disabled:opacity-50
                px-2 py-1"
            type="submit"
            disabled={isLoading || !canSubmit}
          >
            {isLoading ? "Creating..." : "Create"}
          </button>
        </form>
      </div>
    </section>
  );
}
