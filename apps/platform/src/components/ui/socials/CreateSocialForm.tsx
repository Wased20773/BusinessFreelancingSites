import { InputEvent, SubmitEvent } from "react";

type CreateSocialFormParams = {
  handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  handleFormInput(event: InputEvent<HTMLFormElement>): void;
  isLoading: boolean;
  canSubmit: boolean;
  errorMessage: string | null;
};

export default function CreateSocialForm({
  handleSubmit,
  handleFormInput,
  isLoading,
  canSubmit,
  errorMessage,
}: CreateSocialFormParams) {
  return (
    <form
      className="dashboard-card flex flex-col gap-5 p-4"
      onSubmit={handleSubmit}
      onInput={handleFormInput}
    >
      <fieldset>
        <legend>Social info</legend>

        <div>
          <label htmlFor="social-platform">Platform</label>
          <select
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="social-platform"
            name="platform"
            defaultValue=""
            disabled={isLoading}
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
            disabled={isLoading}
          />
        </div>
      </fieldset>

      {errorMessage && (
        <p className="text-red-600" role="alert">
          {errorMessage}
        </p>
      )}

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
