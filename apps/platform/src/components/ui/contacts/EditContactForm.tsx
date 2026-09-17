import type { ContactJson } from "@/types/types";
import type {
  ChangeEvent,
  Dispatch,
  InputEvent,
  SetStateAction,
  SubmitEvent,
} from "react";
import IsSyncedCheckbox from "../IsSyncedCheckbox";

type FormChangeEvent =
  | InputEvent<HTMLFormElement>
  | ChangeEvent<HTMLFormElement>;

type EditContactFormParams = {
  contactData: ContactJson;
  isProcessing: boolean;
  errorMessage: string | null;
  canSubmit: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  isSynced: boolean;
  setIsSynced: Dispatch<SetStateAction<boolean>>;
  handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  handleFormInput(event: FormChangeEvent): void;
  handleDelete(): Promise<void>;
};

const inputClass =
  "mt-1 block w-full rounded-lg border-[0.1rem] border-b-[0.2rem] border-blue-400 bg-gray-100 px-3 py-2 disabled:opacity-50";

export default function EditContactForm({
  contactData,
  isProcessing,
  errorMessage,
  canSubmit,
  isSaving,
  isDeleting,
  isSynced,
  setIsSynced,
  handleSubmit,
  handleFormInput,
  handleDelete,
}: EditContactFormParams) {
  return (
    <form
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      onSubmit={handleSubmit}
      onInput={handleFormInput}
      onChange={handleFormInput}
    >
      <div className="space-y-6 p-5 sm:p-6">
        <fieldset disabled={isProcessing} className="space-y-4">
          <legend className="mb-3 text-lg font-semibold text-gray-900">
            Contact info
          </legend>

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
              placeholder="000-000-0000"
              defaultValue={contactData.phoneNumber ?? ""}
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
              defaultValue={contactData.email ?? ""}
            />
          </div>
        </fieldset>

        <fieldset disabled={isProcessing}>
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
              id="contact-personal"
              name="contactType"
              type="checkbox"
              defaultChecked={contactData.isPersonal}
              className="size-4 accent-blue-600"
            />
            Is this a personal contact?
          </label>
        </fieldset>

        {contactData.syncGroupId && (
          <div className="border-t border-gray-100 pt-5">
            <IsSyncedCheckbox
              hasSyncGroup={Boolean(contactData.syncGroupId)}
              htmlFor="sync-contact"
              inputName="sync-contact"
              isSynced={isSynced}
              setIsSynced={setIsSynced}
              isSaving={isProcessing}
              description="Synchronize this contact across locations"
            />
          </div>
        )}

        {errorMessage && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:px-6">
        <button
          className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          type="button"
          disabled={isProcessing}
          onClick={handleDelete}
        >
          {isDeleting ? "Deleting..." : "Delete Contact"}
        </button>

        <button
          className="rounded-lg border border-emerald-500 bg-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          type="submit"
          disabled={isProcessing || !canSubmit}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
