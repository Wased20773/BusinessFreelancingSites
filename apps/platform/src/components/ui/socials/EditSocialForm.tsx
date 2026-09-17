import { SOCIAL_PLATFORMS } from "@/data/socials";
import type { SocialJson } from "@/types/types";
import type { Dispatch, SetStateAction, SubmitEvent } from "react";
import IsSyncedCheckbox from "../IsSyncedCheckbox";

type SocialPlatform = keyof typeof SOCIAL_PLATFORMS;

type EditSocialFormParams = {
  handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  handleDelete(): Promise<void>;
  isProcessing: boolean;
  selectedPlatform: SocialPlatform | "";
  setSelectedPlatform: Dispatch<SetStateAction<SocialPlatform | "">>;
  profileName: string;
  setProfileName: Dispatch<SetStateAction<string>>;
  previewUrl: string;
  errorMessage: string | null;
  canSubmit: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  socialData: SocialJson;
  isSynced: boolean;
  setIsSynced: Dispatch<SetStateAction<boolean>>;
};

const inputClass =
  "mt-1 block w-full rounded-lg border-[0.1rem] border-b-[0.2rem] border-blue-400 bg-gray-100 px-3 py-2 disabled:opacity-50";

export default function EditSocialForm({
  handleSubmit,
  handleDelete,
  isProcessing,
  selectedPlatform,
  setSelectedPlatform,
  profileName,
  setProfileName,
  previewUrl,
  errorMessage,
  canSubmit,
  isSaving,
  isDeleting,
  socialData,
  isSynced,
  setIsSynced,
}: EditSocialFormParams) {
  return (
    <form
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      onSubmit={handleSubmit}
    >
      <div className="space-y-6 p-5 sm:p-6">
        <fieldset disabled={isProcessing} className="space-y-4">
          <legend className="mb-3 text-lg font-semibold text-gray-900">
            Social info
          </legend>

          <div>
            <label
              htmlFor="social-platform"
              className="font-medium text-gray-900"
            >
              Platform
            </label>
            <select
              className={inputClass}
              id="social-platform"
              name="platform"
              value={selectedPlatform}
              onChange={(event) =>
                setSelectedPlatform(event.target.value as SocialPlatform)
              }
            >
              <option value="" disabled>
                Select a platform
              </option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
              <option value="twitter">Twitter</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="social-profile-name"
              className="font-medium text-gray-900"
            >
              Profile name
            </label>
            <input
              className={inputClass}
              id="social-profile-name"
              name="profileName"
              type="text"
              value={profileName}
              onChange={(event) => {
                const value = event.target.value.replace(/\s{2,}/g, " ");
                setProfileName(value);
              }}
            />
          </div>

          <div>
            <label htmlFor="social-url" className="font-medium text-gray-900">
              URL
            </label>
            <input
              className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-gray-600"
              id="social-url"
              type="url"
              value={previewUrl}
              readOnly
            />
          </div>
        </fieldset>

        {socialData.syncGroupId && (
          <div className="border-t border-gray-100">
            <IsSyncedCheckbox
              hasSyncGroup={Boolean(socialData.syncGroupId)}
              htmlFor="sync-social"
              inputName="sync-social"
              isSynced={isSynced}
              setIsSynced={setIsSynced}
              isSaving={isProcessing}
              description="Synchronize this social across locations"
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
          {isDeleting ? "Deleting..." : "Delete Social"}
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
