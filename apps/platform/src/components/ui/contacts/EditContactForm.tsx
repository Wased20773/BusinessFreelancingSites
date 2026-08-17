import { ContactJson } from "@/types/types";
import { InputEvent, SubmitEvent } from "react";

type EditContactFormParams = {
  contactData: ContactJson;
  isProcessing: boolean;
  errorMessage: string | null;
  canSubmit: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  handleFormInput(event: InputEvent<HTMLFormElement>): void;
  handleDelete(): Promise<void>;
};

export default function EditContactForm({
  contactData,
  isProcessing,
  errorMessage,
  canSubmit,
  isSaving,
  isDeleting,
  handleSubmit,
  handleFormInput,
  handleDelete,
}: EditContactFormParams) {
  return (
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
        <p>
          Personal contacts belong to an individual while a business contact
          belongs to the business itself. This helps developers display either
          type, both, or neither on your website.
        </p>

        <label htmlFor="contact-personal" className="cursor-pointer">
          <input
            className="mr-2"
            id="contact-personal"
            name="contactType"
            type="checkbox"
            defaultChecked={contactData.isPersonal}
          />
          Is this a personal contact?
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
  );
}
