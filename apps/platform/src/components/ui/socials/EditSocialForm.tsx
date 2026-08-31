import { Dispatch, InputEvent, SetStateAction, SubmitEvent } from "react";
import { SOCIAL_PLATFORMS } from "@/data/socials";
import "@/app/dashboard/(protected)/page.css";
import IsSyncedCheckbox from "../IsSyncedCheckbox";
import type { SocialJson } from "@/types/types";

type SocialPlatform = keyof typeof SOCIAL_PLATFORMS;

type EditSocialFormParams = {
  handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  handleFormInput(event: InputEvent<HTMLFormElement>): void;
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

export default function EditSocialForm({
  handleSubmit,
  handleFormInput,
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
      className="dashboard-card flex flex-col gap-5 p-4"
      onSubmit={handleSubmit}
      onInput={handleFormInput}
    >
      <fieldset disabled={isProcessing}>
        <legend>Social info</legend>

        <div>
          <label htmlFor="social-platform">Platform</label>

          <select
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
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
          <label htmlFor="social-profile-name">Profile name</label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
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
          <label htmlFor="social-url">URL</label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-gray-300 bg-gray-100 px-3 py-2"
            id="social-url"
            type="url"
            value={previewUrl}
            readOnly
          />
        </div>
      </fieldset>

      <IsSyncedCheckbox
        hasSyncGroup={Boolean(socialData.syncGroupId)}
        htmlFor="sync-social"
        inputName="sync-social"
        isSynced={isSynced}
        setIsSynced={setIsSynced}
        isSaving={isProcessing}
        description="Synchronize this social across locations"
      />

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
        {isDeleting ? "Deleting..." : "Delete Social"}
      </button>
    </form>
  );
}
