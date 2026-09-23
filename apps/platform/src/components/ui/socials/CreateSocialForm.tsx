import type {
  ChangeEvent,
  Dispatch,
  InputEvent,
  SetStateAction,
  SubmitEvent,
} from "react";
import IsSyncedCheckbox from "../IsSyncedCheckbox";
import RequiredField from "../RequiredField";

type CreateSocialFormParams = {
  handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  handleFormInput(
    event: InputEvent<HTMLFormElement> | ChangeEvent<HTMLFormElement>,
  ): void;
  isCreating: boolean;
  canSubmit: boolean;
  errorMessage: string | null;
  isSynced: boolean;
  setIsSynced: Dispatch<SetStateAction<boolean>>;
};

const inputClass =
  "mt-1 block w-full rounded-lg border-[0.1rem] border-b-[0.2rem] border-blue-400 bg-gray-100 px-3 py-2 disabled:opacity-50";

export default function CreateSocialForm({
  handleSubmit,
  handleFormInput,
  isCreating,
  canSubmit,
  errorMessage,
  isSynced,
  setIsSynced,
}: CreateSocialFormParams) {
  return (
    <form
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      onSubmit={handleSubmit}
      onInput={handleFormInput}
      onChange={handleFormInput}
    >
      <div className="space-y-6 p-5 sm:p-6">
        <fieldset disabled={isCreating} className="space-y-4">
          <legend className="mb-3 text-lg font-semibold text-gray-900">
            Social info
          </legend>

          <div>
            <label
              htmlFor="social-platform"
              className="font-medium text-gray-900"
            >
              Platform
              <RequiredField />
            </label>

            <select
              className={inputClass}
              id="social-platform"
              name="platform"
              defaultValue=""
              required
            >
              <option value="" disabled>
                Select a platform
              </option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
              <option value="x">X</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="social-profile-name"
              className="font-medium text-gray-900"
            >
              Profile name
              <RequiredField />
            </label>
            <p className="mt-1 text-sm text-gray-600">
              The name or username used to identify your business on this
              platform.
            </p>

            <input
              className={inputClass}
              id="social-profile-name"
              name="profileName"
              type="text"
              required
            />
          </div>
        </fieldset>

        <div className="border-t border-gray-100">
          <IsSyncedCheckbox
            hasSyncGroup={true}
            htmlFor="sync-social"
            inputName="sync-social"
            isSynced={isSynced}
            setIsSynced={setIsSynced}
            isSaving={isCreating}
            description="Add this social to all locations"
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
