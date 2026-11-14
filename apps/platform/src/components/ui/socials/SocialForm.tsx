import {
  buildSocialUrl,
  normalizeProfileName,
  SOCIAL_PLATFORM_KEYS,
  SOCIAL_PLATFORMS,
  type SocialPlatform,
} from "@/data/socials";
import type { Dispatch, SetStateAction, SubmitEvent } from "react";
import IsSyncedCheckbox from "../IsSyncedCheckbox";
import RequiredField from "../RequiredField";

type SocialFormProps = {
  onSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  platform: SocialPlatform | "";
  setPlatform: Dispatch<SetStateAction<SocialPlatform | "">>;
  profileName: string;
  setProfileName: Dispatch<SetStateAction<string>>;
  isSynced: boolean;
  setIsSynced: Dispatch<SetStateAction<boolean>>;
  showSync: boolean;
  syncDescription: string;
  canSubmit: boolean;
  isProcessing: boolean;
  submitLabel: string;
  submittingLabel: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  // Edit only.
  onDelete?(): Promise<void>;
  isDeleting?: boolean;
};

const inputClass =
  "mt-1 block w-full rounded-lg border-[0.1rem] border-b-[0.2rem] border-blue-400 bg-gray-100 px-3 py-2 disabled:opacity-50";

/*
 *   Picks a platform, then takes only the profile name. The start of the link is
 *   shown in front of the input, so the user never types or pastes a URL, and the
 *   "Open profile" link lets them check it's the right account before saving.
 **/
export default function SocialForm({
  onSubmit,
  platform,
  setPlatform,
  profileName,
  setProfileName,
  isSynced,
  setIsSynced,
  showSync,
  syncDescription,
  canSubmit,
  isProcessing,
  submitLabel,
  submittingLabel,
  isSubmitting,
  errorMessage,
  onDelete,
  isDeleting = false,
}: SocialFormProps) {
  const config = platform ? SOCIAL_PLATFORMS[platform] : null;
  const result =
    platform && profileName.trim()
      ? normalizeProfileName(platform, profileName)
      : null;
  const nameError = result && "error" in result ? result.error : null;
  const profileUrl =
    platform && result && "profileName" in result
      ? buildSocialUrl(platform, result.profileName)
      : null;

  return (
    <form
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      onSubmit={onSubmit}
    >
      <div className="space-y-6 p-5 sm:p-6">
        <fieldset disabled={isProcessing} className="space-y-5">
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
              value={platform}
              onChange={(event) =>
                setPlatform(event.target.value as SocialPlatform)
              }
              required
            >
              <option value="" disabled>
                Select a platform
              </option>
              {SOCIAL_PLATFORM_KEYS.map((key) => (
                <option key={key} value={key}>
                  {SOCIAL_PLATFORMS[key].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="social-profile-name"
              className="font-medium text-gray-900"
            >
              {config ? `${config.label} name` : "Profile name"}
              <RequiredField />
            </label>
            <p className="mt-1 text-sm text-gray-600">
              {config
                ? `Type just the name from your ${config.label} profile.`
                : "Choose a platform first."}
            </p>

            {config && "hint" in config && (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {config.hint}
              </p>
            )}

            <div
              className={`mt-1 flex w-full items-stretch overflow-hidden rounded-lg border-[0.1rem] border-b-[0.2rem] bg-gray-100 focus-within:ring-2 focus-within:ring-blue-300 ${
                nameError ? "border-red-400" : "border-blue-400"
              } ${config ? "" : "opacity-50"}`}
            >
              {config && (
                <span className="flex shrink-0 items-center border-r border-gray-300 bg-gray-200 px-2 text-sm text-gray-600 sm:px-3">
                  {config.urlPrefix}
                </span>
              )}
              <input
                className="min-w-0 flex-1 bg-transparent px-3 py-2 outline-none"
                id="social-profile-name"
                name="profileName"
                type="text"
                value={profileName}
                onChange={(event) =>
                  setProfileName(event.target.value.replace(/\s/g, ""))
                }
                placeholder={config?.placeholder}
                disabled={!config}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="done"
                maxLength={60}
                aria-invalid={Boolean(nameError)}
                aria-describedby="social-profile-name-status"
                required
              />
            </div>

            <div id="social-profile-name-status" className="mt-2 text-sm">
              {nameError ? (
                <p className="text-red-700">{nameError}</p>
              ) : profileUrl ? (
                <p className="text-gray-600">
                  Links to{" "}
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-medium text-blue-700 underline"
                  >
                    {profileUrl.replace("https://", "")}
                  </a>
                  . Open it to check it&apos;s your account.
                </p>
              ) : null}
            </div>
          </div>
        </fieldset>

        {showSync && (
          <div className="border-t border-gray-100">
            <IsSyncedCheckbox
              hasSyncGroup={true}
              htmlFor="sync-social"
              inputName="sync-social"
              isSynced={isSynced}
              setIsSynced={setIsSynced}
              isSaving={isProcessing}
              description={syncDescription}
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

      <div
        className={`flex flex-wrap items-center gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:px-6 ${
          onDelete ? "justify-between" : "justify-end"
        }`}
      >
        {onDelete && (
          <button
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            disabled={isProcessing}
            onClick={onDelete}
          >
            {isDeleting ? "Deleting..." : "Delete Social"}
          </button>
        )}

        <button
          className="rounded-lg border border-emerald-500 bg-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          type="submit"
          disabled={isProcessing || !canSubmit}
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
