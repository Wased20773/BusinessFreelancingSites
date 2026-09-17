import type { Dispatch, InputEvent, SetStateAction, SubmitEvent } from "react";
import IsSyncedCheckbox from "../IsSyncedCheckbox";

type CreateContactFormParams = {
  handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  handleFormInput(event: InputEvent<HTMLFormElement>): void;
  isCreating: boolean;
  canSubmit: boolean;
  isSynced: boolean;
  setIsSynced: Dispatch<SetStateAction<boolean>>;
  errorMessage: string | null;
};

const inputClass =
  "mt-1 block w-full rounded-lg border-[0.1rem] border-b-[0.2rem] border-blue-400 bg-gray-100 px-3 py-2 disabled:opacity-50";

export default function CreateContactForm({
  handleSubmit,
  handleFormInput,
  isCreating,
  canSubmit,
  isSynced,
  setIsSynced,
  errorMessage,
}: CreateContactFormParams) {
  return (
    <form
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      onSubmit={handleSubmit}
      onInput={handleFormInput}
    >
      <div className="space-y-6 p-5 sm:p-6">
        <fieldset disabled={isCreating} className="space-y-4">
          <legend className="mb-1 text-lg font-semibold text-gray-900">
            Contact info
          </legend>

          <p className="text-sm text-gray-600">
            Provide a phone number, an email address, or both.
          </p>

          <div>
            <label
              htmlFor="contact-phone-number"
              className="font-medium text-gray-900"
            >
              Phone number
            </label>
            <input
              className={inputClass}
              id="contact-phone-number"
              name="phoneNumber"
              type="tel"
              autoComplete="tel"
              pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
              placeholder="123-456-7890"
            />
          </div>

          <div>
            <label
              htmlFor="contact-email"
              className="font-medium text-gray-900"
            >
              Email
            </label>
            <input
              className={inputClass}
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
            />
          </div>
        </fieldset>

        <fieldset disabled={isCreating}>
          <legend className="text-lg font-semibold text-gray-900">
            Contact type
          </legend>

          <p className="mb-4 text-sm leading-6 text-gray-600">
            Personal contacts belong to an individual while a business contact
            belongs to the business itself. This helps developers display either
            type, both, or neither on your website.
          </p>

          <label
            htmlFor="contact-personal"
            className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-900"
          >
            <input
              className="size-4 accent-blue-600"
              id="contact-personal"
              name="contactType"
              type="checkbox"
            />
            Is this a personal contact?
          </label>
        </fieldset>

        <div className="border-t border-gray-100 pt-5">
          <IsSyncedCheckbox
            hasSyncGroup={true}
            htmlFor="sync-contact"
            inputName="sync-contact"
            isSynced={isSynced}
            setIsSynced={setIsSynced}
            isSaving={isCreating}
            description="Add this contact to all locations"
          />
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        )}
      </div>

      <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-5 py-4 sm:px-6">
        <button
          className="rounded-lg border border-emerald-500 bg-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          type="submit"
          disabled={isCreating || !canSubmit}
        >
          {isCreating ? "Creating..." : "Create"}
        </button>
      </div>
    </form>
  );
}
