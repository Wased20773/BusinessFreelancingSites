import { InputEvent, SubmitEvent } from "react";

type CreateContactFormParams = {
  handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  handleFormInput(event: InputEvent<HTMLFormElement>): void;
  isLoading: boolean;
  canSubmit: boolean;
};

export default function CreateContactForm({
  handleSubmit,
  handleFormInput,
  isLoading,
  canSubmit,
}: CreateContactFormParams) {
  return (
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
          />
          Is this a personal contact?
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
  );
}
